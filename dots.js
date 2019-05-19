import 'babel-polyfill'
import $ from 'jquery'
import Two from 'two.js'
import { TweenLite } from 'gsap'
import numberUtils from '@yr/number-utils'

class Dot {
  constructor(element) {
    this.defaultConfig = {
      delayMax: 1,
      animationTime: 5,
      bgDots: 300,
      dotSize: 3,
      sampleRate: 17,
      scale: 0.8,
      element,
      lineWidth: 4,
      maxStrayStart: 200,
      maxStrayEnd: 5,
      stroke: '#5566AA',
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
        pathPoints.push(new Two.Vector(x, y))
      }

      // Dont forget the last point.
      let { x, y } = shape.getPointAtLength(length)
      x = parseFloat(x / this.viewbox.width).toFixed(4)
      y = parseFloat(y / this.viewbox.height).toFixed(4)
      pathPoints.push(new Two.Vector(x, y))

      return pathPoints
    })

    svg.find('svg').remove()
  }

  _drawSVG() {
    const { dotSize, scale, element, animationTime, maxStrayStart, maxStrayEnd } = this.config

    this.back = this.two.makeGroup()

    this.width = $(element).width()
    this.height = $(element).height()

    // Scale the artwork (while maintaining aspect ratio)
    const artWidth = this.width * scale
    const artHeight = artWidth * this.viewbox.aspectRatio

    // For centering artwork.
    const offsetX = (this.width - artWidth) / 2
    const offsetY = (this.height - artHeight) / 2

    this.circleLines = []

    this.shapes.forEach(shapePoints => {
      const shape = []
      for (let i = 0; i < shapePoints.length; i++) {
        // Derive location.
        let end = shapePoints[i]

        // Map to art size & offset.
        end.x = end.x * artWidth + offsetX
        end.y = end.y * artHeight + offsetY

        shape.push({ end })
      }

      // Now, draw the circles
      shape.forEach(({ end }, index) => {
        const start = (shape[index].start = new Two.Vector(
          end.x + numberUtils.rangedRandom(-maxStrayStart, maxStrayStart),
          end.y + numberUtils.rangedRandom(-maxStrayStart, maxStrayStart)
        ))

        const circle = this.two.makeCircle(start.x, start.y, dotSize)
        circle.noStroke()
        shape[index].circle = circle
      })

      this.circleLines.push(shape)
    })

    // return
    // Set up the base animation timer
    TweenLite.to(this, animationTime, {
      from: 0,
      to: 1,
      callbackScope: this,
      onUpdateParams: [`{self}`],
      onUpdate: this.onTick,
      delay: 2,
    })

    this.two.play()
  }

  onTick(tween) {
    const p = tween.progress() // No idea why this isn't playing nice

    // // // Clear the previous lines.
    if (this.paths) {
      this.back.remove(this.paths)
    }
    this.paths = new Two.Group()
    this.back.add(this.paths)

    this.circleLines.forEach(shapes => {
      let points = []
      // Position circles
      shapes.forEach(({ circle, start, end }) => {
        circle.translation = start.lerp(end, p)
        points.push(circle.translation.x, circle.translation.y)
      })
      points.push(false)
      const path = this.two.makePath.apply(this.two, points)
      path.fill = 'none'
      path.stroke = this.config.stroke
      path.linewidth = this.config.lineWidth * tween.progress()
      this.paths.add(path)
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
      // circle.opacity = ranRng(0.5, 1)

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
