import 'babel-polyfill'
import $ from 'jquery'
import Two from 'two.js'

class Dot {
  constructor(element) {
    this.defaultConfig = {
      animationTime: 0.6,
      bgDots: 50,
      sampleRate: 10,
      element,
    }

    this.config = { ...this.defaultConfig, ...element.dataset }
    ;['animationTime'].forEach(key => (this.config[key] = parseFloat(this.config[key])))
    ;[('bgDots', 'sampleRate')].forEach(key => (this.config[key] = parseInt(this.config[key])))
    this._sketch()
    this._initTwo()
    this._drawSVG()
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
    const width = $(this.config.element).width()
    const height = $(this.config.element).height()

    const scale = 0.8
    const artWidth = width * scale
    const artHeight = artWidth * this.viewbox.aspectRatio

    const offsetX = (width - artWidth) / 2
    const offsetY = (height - artHeight) / 2

    this.shapes.forEach(shapePoints => {
      for (var i = 0; i < shapePoints.length; i++) {
        const point1 = shapePoints[i]
        const x1 = point1.x * artWidth + offsetX
        const y1 = point1.y * artHeight + offsetY

        const circle = this.two.makeCircle(x1, y1, 3)
        circle.fill = '#FFFFFF'
        circle.noStroke()

        const p2Index = i + 1 === shapePoints.length ? 0 : i + 1
        const point2 = shapePoints[p2Index]
        const x2 = point2.x * artWidth + offsetX
        const y2 = point2.y * artHeight + offsetY
        const line = this.two.makeLine(x1, y1, x2, y2, true)
        line.stroke = '#CCC'
      }
    })

    this.two.play()
  }

  _drawAndAnimateBG() {
    const ran = max => Math.round(Math.random() * max)
    const ranRng = (min, max) => min + Math.random() * (max - min)

    const particles = []
    const limit = 200

    for (var i = 0; i < limit; i++) {
      const circle = two.makeCircle(ran(window.innerWidth), ran(window.innerHeight), 3)
      circle.fill = '#FFFFFF'
      circle.opacity = ranRng(0.5, 1)

      const maxSpeed = 1
      const momentum = { x: ranRng(-maxSpeed, maxSpeed), y: ranRng(-maxSpeed, maxSpeed) }
      particles.push({ circle, momentum })
    }

    two
      .bind('update', frameCt => {
        // move shit.
        particles.forEach(p => {
          const { circle, momentum } = p
          const current = circle.translation
          current.x = (current.x + momentum.x) % window.innerWidth
          current.y = (current.y + momentum.y) % window.innerHeight
        })
      })
      .play()
  }

  start() {}
}

;(async function() {
  const dots = Array.prototype.slice.call(document.querySelectorAll('.dot'))
  dots.forEach(async dot => {
    const d = new Dot(dot)
    // await d.sketch()
  })
})()
