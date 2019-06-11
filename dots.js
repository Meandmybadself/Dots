import 'babel-polyfill'
import $ from 'jquery' // Only way to do sub-selections of DOM elements.
import Two from 'two.js'
import numberUtils from '@yr/number-utils'

class Dot {
  // Instance properties.

  constructor(element) {
    const defaultConfig = {
      delayTime: 1,
      animationTime: 3,
      bgDots: 200,
      dotSize: 2.5,
      sampleRate: 15,
      scale: 0.8,
      element,
      lineWidth: 3,
      stroke: '#888888',
      maxMomentum: 1,
    }

    this.config = { ...defaultConfig, ...element.dataset }

    // Coerce.
    const floatKeys = ['animationTime']
    const intKeys = ['bgDots', 'sampleRate']
    floatKeys.forEach(key => (this.config[key] = parseFloat(this.config[key])))
    intKeys.forEach(key => (this.config[key] = parseInt(this.config[key])))

    this._sketch()
    this._initTwo()
    this._draw()
    // this._drawAndAnimateBG()
  }

  _initTwo() {
    // const elem = document.getElementById('bg')
    const element = $(this.config.element)
    const params = { type: Two.Types.webgl, width: element.width(), height: element.height(), ratio: 4 }
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

    const widthAsFloat = parseFloat(width)
    const heightAsFloat = parseFloat(height)

    this.points = 0

    this.viewbox = {
      xMin: parseFloat(xMin),
      yMin: parseFloat(yMin),
      width: widthAsFloat,
      height: heightAsFloat,
      aspectRatio: heightAsFloat / widthAsFloat,
    }

    this.viewbox.aspectRatio = this.viewbox.height / this.viewbox.width

    this.shapes = [...paths, ...polygons].map(shape => {
      const length = shape.getTotalLength()
      const points = Math.floor(length / sampleRate)
      const pathPoints = []
      for (let i = 0; i <= points; i++) {
        const p = i * sampleRate

        // https://developer.mozilla.org/en-US/docs/Web/API/SVGPathElement/getPointAtLength
        let { x, y } = shape.getPointAtLength(p)
        // Normalize to 0-1
        x = (x / this.viewbox.width).toFixed(4)
        y = (y / this.viewbox.height).toFixed(4)
        pathPoints.push(new Two.Vector(x, y))
        this.points += 1
      }

      return pathPoints
    })

    svg.find('svg').remove()
  }

  _draw() {
    const { dotSize, scale, element, animationTime, delayTime } = this.config

    // This is used to depth sort the lines behind everything else.
    this.back = this.two.makeGroup()

    this.width = $(element).width()
    this.height = $(element).height()

    // Scale the artwork (while maintaining aspect ratio)
    const artWidth = this.width * scale
    const artHeight = artWidth * this.viewbox.aspectRatio

    // For centering artwork.
    const offsetX = (this.width - artWidth) / 2
    const offsetY = (this.height - artHeight) / 2

    const totalFrames = this.getTotalAnimationTime()

    this.circleLines = this.shapes.map(shapePoints =>
      shapePoints.map(end => {
        // Derive location.
        // Map to art size & offset.
        end.x = end.x * artWidth + offsetX
        end.y = end.y * artHeight + offsetY

        // Take a random momentum vector & multiply it by the time to determine where it starts.
        const momentum = this.getRandomMomentum()
        const x = end.x - momentum.x * totalFrames
        const y = end.y - momentum.y * totalFrames
        const start = new Two.Vector(x, y)

        const circle = this.two.makeCircle(start.x, start.y, dotSize)
        circle.fill = '#FFFFFF'
        circle.noStroke()

        return { start, end, circle, isShapePoint: true }
      })
    )

    this.two.bind('update', framecount => this.onTick(framecount))
    this.start = Date.now()
    this.two.play()
  }

  getRandomMomentum() {
    return new Two.Vector(
      this.ranRng(-this.config.maxMomentum, this.config.maxMomentum),
      this.ranRng(-this.config.maxMomentum, this.config.maxMomentum)
    )
  }

  getTotalAnimationTime() {
    return (this.config.delayTime + this.config.animationTime) * 1000
  }

  onTick(framecount) {
    const timeElapsed = Date.now() - this.start
    const p = timeElapsed / this.getTotalAnimationTime()
    console.log(timeElapsed, this.getTotalAnimationTime(), p)

    if (p <= 1) {
      console.log(p, Date.now() - this.start)
      // Clear the previous lines.
      if (this.paths) {
        this.back.remove(this.paths)
      }
      this.paths = new Two.Group()
      this.back.add(this.paths)
      let cp = Math.min(p, 1)
      this.circleLines.forEach(shapes => {
        let points = []
        // Position circles
        shapes.forEach(({ circle, start, end }) => {
          // .lerp ain't working. build own lerp.
          const x = start.x + (end.x - start.x) * cp
          const y = start.y + (end.y - start.y) * cp
          circle.translation.set(x, y)
          circle.opacity = 1
          points.push(x, y)
        })

        // points.push(false) // Last arg in path, denoting if it's an open or closed path.
        // const path = this.two.makePath.apply(this.two, points)
        // path.fill = 'none'
        // path.stroke = this.config.stroke
        // path.linewidth = this.config.lineWidth // * //this.config.lineWidth * cp
        // this.paths.add(path)
      })
    }
  }

  ranRng(min, max) {
    return min + Math.random() * (max - min)
  }

  _drawAndAnimateBG() {
    const particles = []

    // Randomly plot
    for (let i = 0; i < this.config.bgDots; i++) {
      const circle = this.two.makeCircle(
        numberUtils.rangedRandom(0, this.width),
        numberUtils.rangedRandom(0, this.height),
        this.config.dotSize
      )
      circle.fill = '#FFFFFF'

      const momentum = this.getRandomMomentum()
      particles.push({ circle, momentum })
    }

    this.two
      .bind('update', frameCt => {
        particles.forEach(p => {
          const { circle, momentum } = p
          const current = circle.translation

          let { x, y } = current
          x = x + momentum.x
          y = y + momentum.y

          if (x > this.width) {
            x = 0
          } else if (x < 0) {
            x = this.height
          }

          if (y > this.height) {
            y = 0
          } else if (y < 0) {
            y = this.height
          }

          current.set(x, y)
        })
      })
      .play()
  }
}

;(async function() {
  const dots = Array.prototype.slice.call(document.querySelectorAll('.dot'))
  dots.forEach(async dot => new Dot(dot))
})()
