import 'babel-polyfill'
import path from 'svg-path-properties'
import $ from 'jquery'
import Two from 'two.js'

class Dot {
  constructor(config) {
    this.defaultConfig = {
      animationTime: 0.6,
      bgDots: 50,
      sampleRate: 5,
    }
    this.config = { ...this.defaultConfig, ...config }
    ;['animationTime'].forEach(key => (this.config[key] = parseFloat(this.config[key])))
    ;[('bgDots', 'sampleRate')].forEach(key => (this.config[key] = parseInt(this.config[key])))
  }

  async init() {
    let response
    try {
      response = await fetch(this.config.svg)
    } catch (e) {
      console.error(`Error whilst loading svg: ${this.config.svg}`)
    }
    const data = await response.text()
    const svg = $(data)
    const paths = svg.find('path')
    const polygons = svg.find('polygon')

    console.log(data)
  }

  _captureSVGPoints() {}

  _drawAndAnimateBG() {
    const elem = document.getElementById('bg')
    const params = { type: Two.Types.webgl, width: window.innerWidth, height: window.innerHeight }
    const two = new Two(params).appendTo(elem)

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
    const d = new Dot(dot.dataset)
    await d.init()
  })
})()
