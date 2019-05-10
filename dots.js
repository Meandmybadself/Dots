import 'babel-polyfill'
import $ from 'jquery'
import Two from 'two.js'
import { TweenLite } from 'gsap'
import numberUtils from '@yr/number-utils'

class Dot {
  constructor(element) {
    this.defaultConfig = {
      delayMax: 1,
      animationTime: 6,
      bgDots: 1000,
      dotSize: 3,
      sampleRate: 10,
      scale: 0.7,
      element,
    }

    this.config = { ...this.defaultConfig, ...element.dataset }
    ;['animationTime'].forEach(key => (this.config[key] = parseFloat(this.config[key])))
    ;[('bgDots', 'sampleRate')].forEach(key => (this.config[key] = parseInt(this.config[key])))
    this._sketch()
    this._initTwo()
    this._drawSVG()
    this._drawAndAnimateBG()
  }

  _initTwo() {
    // const elem = document.getElementById('bg')
    const element = $(this.config.element)
    const params = { type: Two.Types.webgl, width: element.width(), height: element.height() }
    this.two = new Two(params).appendTo(this.config.element)
  }

  _nodelist2arr(nodelist) {
    return Array.prototype.slice.call(nodelist)
  }

  _sketch() {
    const { sampleRate, element } = this.config

    const svg = $(element)
    const paths = svg.find('path').toArray()
    const polygons = svg.find('polygon').toArray()

    // Capture the viewbox.
    const [_, xMin, yMin, width, height] = /viewBox="([^\s]+) ([^\s]+) ([^\s]+) ([^\s]+)"/.exec(svg.prop('outerHTML'))

    this.viewbox = {
      xMin: parseFloat(xMin),
      yMin: parseFloat(yMin),
      width: parseFloat(width),
      height: parseFloat(height),
    }

    this.viewbox.aspectRatio = this.viewbox.height / this.viewbox.width

    this.shapes = [...paths, ...polygons].map(shape => {
      const length = shape.getTotalLength()
      const points = Math.floor(length / sampleRate)
      const pathPoints = []
      for (var i = 0; i < points; i++) {
        const p = i * sampleRate
        let { x, y } = shape.getPointAtLength(p)
        x = parseFloat(x / this.viewbox.width).toFixed(4)
        y = parseFloat(y / this.viewbox.height).toFixed(4)
        pathPoints.push({ x, y })
      }
      return pathPoints
    })

    svg.find('svg').remove()
  }

  _drawSVG() {
    this.width = $(this.config.element).width()
    this.height = $(this.config.element).height()

    const scale = this.config.scale
    const artWidth = this.width * scale
    const artHeight = artWidth * this.viewbox.aspectRatio

    const offsetX = (this.width - artWidth) / 2
    const offsetY = (this.height - artHeight) / 2

    const circles = []

    this.shapes.forEach(shapePoints => {
      for (var i = 0; i < shapePoints.length; i++) {
        const point1 = shapePoints[i]
        const x1 = point1.x * artWidth + offsetX
        const y1 = point1.y * artHeight + offsetY

        const p2Index = i + 1 === shapePoints.length ? 0 : i + 1
        const point2 = shapePoints[p2Index]
        const x2 = point2.x * artWidth + offsetX
        const y2 = point2.y * artHeight + offsetY
        const line = this.two.makeLine(0, 0, 100, 0, true)
        line.stroke = '#555'
        line.linewidth = 2

        const circle = this.two.makeCircle(x1, y1, this.config.dotSize)
        // circles.push({ circle,  x: "-=10", y: "+=20"})
        const maxDist = this.width / 2
        TweenLite.from(circle, this.config.animationTime, {
          x0: x1 + numberUtils.rangedRandom(-maxDist, maxDist),
          y0: y1 + numberUtils.rangedRandom(-maxDist, maxDist),
          x1: x1,
          y1: y1,
          onUpdateParams: ['{self}', { circle, line }],
          onUpdate: function(t, shapes) {
            const p = t.progress()

            const cTranslation = shapes.circle.translation
            cTranslation.x = numberUtils.interpolate(p, t.vars.x0, t.vars.x1)
            cTranslation.y = numberUtils.interpolate(p, t.vars.y0, t.vars.y1)

            const lTranslation = shapes.line.translation
            lTranslation.x = numberUtils.interpolate(p, t.vars.x0, t.vars.x1)
            lTranslation.y = numberUtils.interpolate(p, t.vars.y0, t.vars.y1)
          },
        })
        circle.fill = '#FFFFFF'
        circle.noStroke()
      }
    })
  }

  _drawAndAnimateBG() {
    const ran = max => Math.round(Math.random() * max)
    const ranRng = (min, max) => min + Math.random() * (max - min)

    const particles = []

    for (var i = 0; i < this.config.bgDots; i++) {
      const circle = this.two.makeCircle(
        numberUtils.rangedRandom(0, this.width),
        numberUtils.rangedRandom(0, this.height),
        this.config.dotSize
      )
      circle.fill = '#FFFFFF'
      circle.opacity = ranRng(0.5, 1)

      const maxSpeed = 1
      const momentum = { x: ranRng(-maxSpeed, maxSpeed), y: ranRng(-maxSpeed, maxSpeed) }
      particles.push({ circle, momentum })
    }

    this.two
      .bind('update', frameCt => {
        // move shit.
        particles.forEach(p => {
          const { circle, momentum } = p
          const current = circle.translation
          current.x = (current.x + momentum.x) % this.width
          current.y = (current.y + momentum.y) % this.height
        })
      })
      .play()
  }
}

;(async function() {
  const dots = Array.prototype.slice.call(document.querySelectorAll('.dot'))
  dots.forEach(async dot => {
    const d = new Dot(dot)
  })
})()
