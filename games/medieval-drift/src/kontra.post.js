(() => {
  // ../node_modules/kontra/kontra.js
  var kontra = function() {
    let noop = () => {
    };
    let srOnlyStyle = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);";
    function addToDom(node, canvas) {
      let container = canvas.parentNode;
      node.setAttribute("data-kontra", "");
      if (container) {
        let target = container.querySelector("[data-kontra]:last-of-type") || canvas;
        container.insertBefore(node, target.nextSibling);
      } else {
        document.body.appendChild(node);
      }
    }
    function removeFromArray(array, item) {
      let index = array.indexOf(item);
      if (index != -1) {
        array.splice(index, 1);
        return true;
      }
    }
    let callbacks$2 = {};
    function on(event, callback) {
      callbacks$2[event] = callbacks$2[event] || [];
      callbacks$2[event].push(callback);
    }
    function off(event, callback) {
      callbacks$2[event] = (callbacks$2[event] || []).filter(
        (fn) => fn != callback
      );
    }
    function emit(event, ...args) {
      (callbacks$2[event] || []).map((fn) => fn(...args));
    }
    let canvasEl, context;
    let handler$1 = {
      // by using noop we can proxy both property and function calls
      // so neither will throw errors
      get(target, key) {
        if (key == "_proxy")
          return true;
        return noop;
      }
    };
    function getCanvas() {
      return canvasEl;
    }
    function getContext() {
      return context;
    }
    function init$1(canvas, { contextless = false } = {}) {
      canvasEl = document.getElementById(canvas) || canvas || document.querySelector("canvas");
      if (contextless) {
        canvasEl = canvasEl || new Proxy({}, handler$1);
      }
      if (!canvasEl) {
        throw Error("You must provide a canvas element for the game");
      }
      context = canvasEl.getContext("2d") || new Proxy({}, handler$1);
      context.imageSmoothingEnabled = false;
      emit("init");
      return { canvas: canvasEl, context };
    }
    class Animation {
      constructor({ spriteSheet, frames, frameRate, loop = true, name }) {
        let { width, height, margin = 0 } = spriteSheet.frame;
        Object.assign(this, {
          /**
           * The sprite sheet to use for the animation.
           * @memberof Animation
           * @property {SpriteSheet} spriteSheet
           */
          spriteSheet,
          /**
           * Sequence of frames to use from the sprite sheet.
           * @memberof Animation
           * @property {Number[]} frames
           */
          frames,
          /**
           * Number of frames to display per second. Adjusting this value will change the speed of the animation.
           * @memberof Animation
           * @property {Number} frameRate
           */
          frameRate,
          /**
           * If the animation should loop back to the beginning once completed.
           * @memberof Animation
           * @property {Boolean} loop
           */
          loop,
          /**
           * The name of the animation.
           * @memberof Animation
           * @property {String} name
           */
          name,
          /**
           * The width of an individual frame. Taken from the [frame width value](api/spriteSheet#frame) of the sprite sheet.
           * @memberof Animation
           * @property {Number} width
           */
          width,
          /**
           * The height of an individual frame. Taken from the [frame height value](api/spriteSheet#frame) of the sprite sheet.
           * @memberof Animation
           * @property {Number} height
           */
          height,
          /**
           * The space between each frame. Taken from the [frame margin value](api/spriteSheet#frame) of the sprite sheet.
           * @memberof Animation
           * @property {Number} margin
           */
          margin,
          /**
           * If the animation is currently stopped. Stopped animations will not update when the [update()](api/animation#update) function is called.
           *
           * Animations are not considered stopped until either the [stop()](api/animation#stop) function is called or the animation gets to the last frame and does not loop.
           *
           * ```js
           * import { Animation } from 'kontra';
           *
           * let animation = Animation({
           *   // ...
           * });
           * console.log(animation.isStopped);  //=> false
           *
           * animation.start();
           * console.log(animation.isStopped);  //=> false
           *
           * animation.stop();
           * console.log(animation.isStopped);  //=> true
           * ```
           * @memberof Animation
           * @property {Boolean} isStopped
           */
          isStopped: false,
          // f = frame, a = accumulator
          _f: 0,
          _a: 0
        });
      }
      /**
       * Clone an animation so it can be used more than once. By default animations passed to [Sprite](api/sprite) will be cloned so no two sprites update the same animation. Otherwise two sprites who shared the same animation would make it update twice as fast.
       * @memberof Animation
       * @function clone
       *
       * @returns {Animation} A new Animation instance.
       */
      clone() {
        return new Animation(this);
      }
      /**
       * Start the animation.
       * @memberof Animation
       * @function start
       */
      start() {
        this.isStopped = false;
        if (!this.loop) {
          this.reset();
        }
      }
      /**
       * Stop the animation.
       * @memberof Animation
       * @function stop
       */
      stop() {
        this.isStopped = true;
      }
      /**
       * Reset an animation to the first frame.
       * @memberof Animation
       * @function reset
       */
      reset() {
        this._f = 0;
        this._a = 0;
      }
      /**
       * Update the animation.
       * @memberof Animation
       * @function update
       *
       * @param {Number} [dt=1/60] - Time since last update.
       */
      update(dt = 1 / 60) {
        if (this.isStopped) {
          return;
        }
        if (!this.loop && this._f == this.frames.length - 1) {
          this.stop();
          return;
        }
        this._a += dt;
        while (this._a * this.frameRate >= 1) {
          this._f = ++this._f % this.frames.length;
          this._a -= 1 / this.frameRate;
        }
      }
      /**
       * Draw the current frame of the animation.
       * @memberof Animation
       * @function render
       *
       * @param {Object} properties - Properties to draw the animation.
       * @param {Number} properties.x - X position to draw the animation.
       * @param {Number} properties.y - Y position to draw the animation.
       * @param {Number} [properties.width] - width of the sprite. Defaults to [Animation.width](api/animation#width).
       * @param {Number} [properties.height] - height of the sprite. Defaults to [Animation.height](api/animation#height).
       * @param {CanvasRenderingContext2D} [properties.context] - The context the animation should draw to. Defaults to [core.getContext()](api/core#getContext).
       */
      render({
        x,
        y,
        width = this.width,
        height = this.height,
        context: context2 = getContext()
      }) {
        let row = this.frames[this._f] / this.spriteSheet._f | 0;
        let col = this.frames[this._f] % this.spriteSheet._f | 0;
        context2.drawImage(
          this.spriteSheet.image,
          col * this.width + (col * 2 + 1) * this.margin,
          row * this.height + (row * 2 + 1) * this.margin,
          this.width,
          this.height,
          x,
          y,
          width,
          height
        );
      }
    }
    function factory$b() {
      return new Animation(...arguments);
    }
    let imageRegex = /(jpeg|jpg|gif|png|webp)$/;
    let audioRegex = /(wav|mp3|ogg|aac)$/;
    let leadingSlash = /^\//;
    let trailingSlash = /\/$/;
    let dataMap = /* @__PURE__ */ new WeakMap();
    let imagePath = "";
    let audioPath = "";
    let dataPath = "";
    function getUrl(url, base) {
      return new URL(url, base).href;
    }
    function joinPath(base, url) {
      return [
        base.replace(trailingSlash, ""),
        base ? url.replace(leadingSlash, "") : url
      ].filter((s) => s).join("/");
    }
    function getExtension(url) {
      return url.split(".").pop();
    }
    function getName(url) {
      let name = url.replace("." + getExtension(url), "");
      return name.split("/").length == 2 ? name.replace(leadingSlash, "") : name;
    }
    function getCanPlay(audio) {
      return {
        wav: audio.canPlayType('audio/wav; codecs="1"'),
        mp3: audio.canPlayType("audio/mpeg;"),
        ogg: audio.canPlayType('audio/ogg; codecs="vorbis"'),
        aac: audio.canPlayType("audio/aac;")
      };
    }
    let imageAssets = {};
    let audioAssets = {};
    let dataAssets = {};
    function addGlobal() {
      if (!window.__k) {
        window.__k = {
          dm: dataMap,
          u: getUrl,
          d: dataAssets,
          i: imageAssets
        };
      }
    }
    function setImagePath(path) {
      imagePath = path;
    }
    function setAudioPath(path) {
      audioPath = path;
    }
    function setDataPath(path) {
      dataPath = path;
    }
    function loadImage(url) {
      addGlobal();
      return new Promise((resolve, reject) => {
        let resolvedUrl, image, fullUrl;
        resolvedUrl = joinPath(imagePath, url);
        if (imageAssets[resolvedUrl])
          return resolve(imageAssets[resolvedUrl]);
        image = new Image();
        image.onload = function loadImageOnLoad() {
          fullUrl = getUrl(resolvedUrl, window.location.href);
          imageAssets[getName(url)] = imageAssets[resolvedUrl] = imageAssets[fullUrl] = this;
          emit("assetLoaded", this, url);
          resolve(this);
        };
        image.onerror = function loadImageOnError() {
          reject(
            /* @ifdef DEBUG */
            "Unable to load image " + /* @endif */
            resolvedUrl
          );
        };
        image.src = resolvedUrl;
      });
    }
    function loadAudio(url) {
      return new Promise((resolve, reject) => {
        let _url = url, audioEl, canPlay, resolvedUrl, fullUrl;
        audioEl = new Audio();
        canPlay = getCanPlay(audioEl);
        url = [].concat(url).reduce(
          (playableSource, source) => playableSource ? playableSource : canPlay[getExtension(source)] ? source : null,
          0
        );
        if (!url) {
          return reject(
            /* @ifdef DEBUG */
            "cannot play any of the audio formats provided " + /* @endif */
            _url
          );
        }
        resolvedUrl = joinPath(audioPath, url);
        if (audioAssets[resolvedUrl])
          return resolve(audioAssets[resolvedUrl]);
        audioEl.addEventListener("canplay", function loadAudioOnLoad() {
          fullUrl = getUrl(resolvedUrl, window.location.href);
          audioAssets[getName(url)] = audioAssets[resolvedUrl] = audioAssets[fullUrl] = this;
          emit("assetLoaded", this, url);
          resolve(this);
        });
        audioEl.onerror = function loadAudioOnError() {
          reject(
            /* @ifdef DEBUG */
            "Unable to load audio " + /* @endif */
            resolvedUrl
          );
        };
        audioEl.src = resolvedUrl;
        audioEl.load();
      });
    }
    function loadData(url) {
      addGlobal();
      let resolvedUrl, fullUrl;
      resolvedUrl = joinPath(dataPath, url);
      if (dataAssets[resolvedUrl])
        return Promise.resolve(dataAssets[resolvedUrl]);
      return fetch(resolvedUrl).then((response) => {
        if (!response.ok)
          throw response;
        return response.clone().json().catch(() => response.text());
      }).then((response) => {
        fullUrl = getUrl(resolvedUrl, window.location.href);
        if (typeof response == "object") {
          dataMap.set(response, fullUrl);
        }
        dataAssets[getName(url)] = dataAssets[resolvedUrl] = dataAssets[fullUrl] = response;
        emit("assetLoaded", response, url);
        return response;
      });
    }
    function load(...urls) {
      addGlobal();
      return Promise.all(
        urls.map((asset) => {
          let extension = getExtension([].concat(asset)[0]);
          return extension.match(imageRegex) ? loadImage(asset) : extension.match(audioRegex) ? loadAudio(asset) : loadData(asset);
        })
      );
    }
    function degToRad(deg) {
      return deg * Math.PI / 180;
    }
    function radToDeg(rad) {
      return rad * 180 / Math.PI;
    }
    function angleToTarget(source, target) {
      return Math.atan2(target.y - source.y, target.x - source.x);
    }
    function rotatePoint(point, angle) {
      let sin = Math.sin(angle);
      let cos = Math.cos(angle);
      return {
        x: point.x * cos - point.y * sin,
        y: point.x * sin + point.y * cos
      };
    }
    function movePoint(point, angle, distance) {
      return {
        x: point.x + Math.cos(angle) * distance,
        y: point.y + Math.sin(angle) * distance
      };
    }
    function randInt(min, max) {
      return (Math.random() * (max - min + 1) | 0) + min;
    }
    function seedRand(str) {
      for (var i = 0, h = 2166136261 >>> 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 16777619);
      }
      h += h << 13;
      h ^= h >>> 7;
      h += h << 3;
      h ^= h >>> 17;
      let seed = (h += h << 5) >>> 0;
      let rand = () => (2 ** 31 - 1 & (seed = Math.imul(48271, seed))) / 2 ** 31;
      rand();
      return rand;
    }
    function lerp(start, end, percent) {
      return start * (1 - percent) + end * percent;
    }
    function inverseLerp(start, end, value) {
      return (value - start) / (end - start);
    }
    function clamp(min, max, value) {
      return Math.min(Math.max(min, value), max);
    }
    function setStoreItem(key, value) {
      if (value == void 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
    function getStoreItem(key) {
      let value = localStorage.getItem(key);
      try {
        value = JSON.parse(value);
      } catch (e) {
      }
      return value;
    }
    function collides(obj1, obj2) {
      [obj1, obj2] = [obj1, obj2].map((obj) => getWorldRect(obj));
      return obj1.x < obj2.x + obj2.width && obj1.x + obj1.width > obj2.x && obj1.y < obj2.y + obj2.height && obj1.y + obj1.height > obj2.y;
    }
    function getWorldRect(obj) {
      let { x = 0, y = 0, width, height } = obj.world || obj;
      if (obj.mapwidth) {
        width = obj.mapwidth;
        height = obj.mapheight;
      }
      if (obj.anchor) {
        x -= width * obj.anchor.x;
        y -= height * obj.anchor.y;
      }
      if (width < 0) {
        x += width;
        width *= -1;
      }
      if (height < 0) {
        y += height;
        height *= -1;
      }
      return {
        x,
        y,
        width,
        height
      };
    }
    function depthSort(obj1, obj2, prop = "y") {
      [obj1, obj2] = [obj1, obj2].map(getWorldRect);
      return obj1[prop] - obj2[prop];
    }
    class Vector {
      constructor(x = 0, y = 0, vec = {}) {
        if (x.x != void 0) {
          this.x = x.x;
          this.y = x.y;
        } else {
          this.x = x;
          this.y = y;
        }
        if (vec._c) {
          this.clamp(vec._a, vec._b, vec._d, vec._e);
          this.x = x;
          this.y = y;
        }
      }
      /**
       * Set the x and y coordinate of the vector.
       * @memberof Vector
       * @function set
       *
       * @param {Vector|{x: number, y: number}} vector - Vector to set coordinates from.
       */
      set(vec) {
        this.x = vec.x;
        this.y = vec.y;
      }
      /**
       * Calculate the addition of the current vector with the given vector.
       * @memberof Vector
       * @function add
       *
       * @param {Vector|{x: number, y: number}} vector - Vector to add to the current Vector.
       *
       * @returns {Vector} A new Vector instance whose value is the addition of the two vectors.
       */
      add(vec) {
        return new Vector(this.x + vec.x, this.y + vec.y, this);
      }
      // @ifdef VECTOR_SUBTRACT
      /**
       * Calculate the subtraction of the current vector with the given vector.
       * @memberof Vector
       * @function subtract
       *
       * @param {Vector|{x: number, y: number}} vector - Vector to subtract from the current Vector.
       *
       * @returns {Vector} A new Vector instance whose value is the subtraction of the two vectors.
       */
      subtract(vec) {
        return new Vector(this.x - vec.x, this.y - vec.y, this);
      }
      // @endif
      // @ifdef VECTOR_SCALE
      /**
       * Calculate the multiple of the current vector by a value.
       * @memberof Vector
       * @function scale
       *
       * @param {Number} value - Value to scale the current Vector.
       *
       * @returns {Vector} A new Vector instance whose value is multiplied by the scalar.
       */
      scale(value) {
        return new Vector(this.x * value, this.y * value);
      }
      // @endif
      // @ifdef VECTOR_NORMALIZE
      /**
       * Calculate the normalized value of the current vector. Requires the Vector [length](api/vector#length) function.
       * @memberof Vector
       * @function normalize
       *
       * @returns {Vector} A new Vector instance whose value is the normalized vector.
       */
      // @see https://github.com/jed/140bytes/wiki/Byte-saving-techniques#use-placeholder-arguments-instead-of-var
      normalize(length = this.length() || 1) {
        return new Vector(this.x / length, this.y / length);
      }
      // @endif
      // @ifdef VECTOR_DOT||VECTOR_ANGLE
      /**
       * Calculate the dot product of the current vector with the given vector.
       * @memberof Vector
       * @function dot
       *
       * @param {Vector|{x: number, y: number}} vector - Vector to dot product against.
       *
       * @returns {Number} The dot product of the vectors.
       */
      dot(vec) {
        return this.x * vec.x + this.y * vec.y;
      }
      // @endif
      // @ifdef VECTOR_LENGTH||VECTOR_NORMALIZE||VECTOR_ANGLE
      /**
       * Calculate the length (magnitude) of the Vector.
       * @memberof Vector
       * @function length
       *
       * @returns {Number} The length of the vector.
       */
      length() {
        return Math.hypot(this.x, this.y);
      }
      // @endif
      // @ifdef VECTOR_DISTANCE
      /**
       * Calculate the distance between the current vector and the given vector.
       * @memberof Vector
       * @function distance
       *
       * @param {Vector|{x: number, y: number}} vector - Vector to calculate the distance between.
       *
       * @returns {Number} The distance between the two vectors.
       */
      distance(vec) {
        return Math.hypot(this.x - vec.x, this.y - vec.y);
      }
      // @endif
      // @ifdef VECTOR_ANGLE
      /**
       * Calculate the angle (in radians) between the current vector and the given vector. Requires the Vector [dot](api/vector#dot) and [length](api/vector#length) functions.
       * @memberof Vector
       * @function angle
       *
       * @param {Vector} vector - Vector to calculate the angle between.
       *
       * @returns {Number} The angle (in radians) between the two vectors.
       */
      angle(vec) {
        return Math.acos(this.dot(vec) / (this.length() * vec.length()));
      }
      // @endif
      // @ifdef VECTOR_DIRECTION
      /**
       * Calculate the angle (in radians) of the current vector.
       * @memberof Vector
       * @function direction
       *
       * @returns {Number} The angle (in radians) of the vector.
       */
      direction() {
        return Math.atan2(this.y, this.x);
      }
      // @endif
      // @ifdef VECTOR_CLAMP
      /**
       * Clamp the Vector between two points, preventing `x` and `y` from going below or above the minimum and maximum values. Perfect for keeping a sprite from going outside the game boundaries.
       *
       * ```js
       * import { Vector } from 'kontra';
       *
       * let vector = Vector(100, 200);
       * vector.clamp(0, 0, 200, 300);
       *
       * vector.x += 200;
       * console.log(vector.x);  //=> 200
       *
       * vector.y -= 300;
       * console.log(vector.y);  //=> 0
       *
       * vector.add({x: -500, y: 500});
       * console.log(vector);    //=> {x: 0, y: 300}
       * ```
       * @memberof Vector
       * @function clamp
       *
       * @param {Number} xMin - Minimum x value.
       * @param {Number} yMin - Minimum y value.
       * @param {Number} xMax - Maximum x value.
       * @param {Number} yMax - Maximum y value.
       */
      clamp(xMin, yMin, xMax, yMax) {
        this._c = true;
        this._a = xMin;
        this._b = yMin;
        this._d = xMax;
        this._e = yMax;
      }
      /**
       * X coordinate of the vector.
       * @memberof Vector
       * @property {Number} x
       */
      get x() {
        return this._x;
      }
      /**
       * Y coordinate of the vector.
       * @memberof Vector
       * @property {Number} y
       */
      get y() {
        return this._y;
      }
      set x(value) {
        this._x = this._c ? clamp(this._a, this._d, value) : value;
      }
      set y(value) {
        this._y = this._c ? clamp(this._b, this._e, value) : value;
      }
      // @endif
    }
    function factory$a() {
      return new Vector(...arguments);
    }
    class Updatable {
      constructor(properties) {
        return this.init(properties);
      }
      init(properties = {}) {
        this.position = factory$a();
        this.velocity = factory$a();
        this.acceleration = factory$a();
        this.ttl = Infinity;
        Object.assign(this, properties);
      }
      /**
       * Update the position of the game object and all children using their velocity and acceleration. Calls the game objects [advance()](api/gameObject#advance) function.
       * @memberof GameObject
       * @function update
       * @page GameObject
       *
       * @param {Number} [dt] - Time since last update.
       */
      update(dt) {
        this.advance(dt);
      }
      /**
       * Move the game object by its acceleration and velocity. If you pass `dt` it will multiply the vector and acceleration by that number. This means the `dx`, `dy`, `ddx` and `ddy` should be how far you want the object to move in 1 second rather than in 1 frame.
       *
       * If you override the game objects [update()](api/gameObject#update) function with your own update function, you can call this function to move the game object normally.
       *
       * ```js
       * import { GameObject } from 'kontra';
       *
       * let gameObject = GameObject({
       *   x: 100,
       *   y: 200,
       *   width: 20,
       *   height: 40,
       *   dx: 5,
       *   dy: 2,
       *   update: function() {
       *     // move the game object normally
       *     this.advance();
       *
       *     // change the velocity at the edges of the canvas
       *     if (this.x < 0 ||
       *         this.x + this.width > this.context.canvas.width) {
       *       this.dx = -this.dx;
       *     }
       *     if (this.y < 0 ||
       *         this.y + this.height > this.context.canvas.height) {
       *       this.dy = -this.dy;
       *     }
       *   }
       * });
       * ```
       * @memberof GameObject
       * @function advance
       * @page GameObject
       *
       * @param {Number} [dt] - Time since last update.
       *
       */
      advance(dt) {
        let acceleration = this.acceleration;
        if (dt) {
          acceleration = acceleration.scale(dt);
        }
        this.velocity = this.velocity.add(acceleration);
        let velocity = this.velocity;
        if (dt) {
          velocity = velocity.scale(dt);
        }
        this.position = this.position.add(velocity);
        this._pc();
        this.ttl--;
      }
      // --------------------------------------------------
      // velocity
      // --------------------------------------------------
      // @ifdef GAMEOBJECT_VELOCITY
      /**
       * X coordinate of the velocity vector.
       * @memberof GameObject
       * @property {Number} dx
       * @page GameObject
       */
      get dx() {
        return this.velocity.x;
      }
      /**
       * Y coordinate of the velocity vector.
       * @memberof GameObject
       * @property {Number} dy
       * @page GameObject
       */
      get dy() {
        return this.velocity.y;
      }
      set dx(value) {
        this.velocity.x = value;
      }
      set dy(value) {
        this.velocity.y = value;
      }
      // @endif
      // --------------------------------------------------
      // acceleration
      // --------------------------------------------------
      // @ifdef GAMEOBJECT_ACCELERATION
      /**
       * X coordinate of the acceleration vector.
       * @memberof GameObject
       * @property {Number} ddx
       * @page GameObject
       */
      get ddx() {
        return this.acceleration.x;
      }
      /**
       * Y coordinate of the acceleration vector.
       * @memberof GameObject
       * @property {Number} ddy
       * @page GameObject
       */
      get ddy() {
        return this.acceleration.y;
      }
      set ddx(value) {
        this.acceleration.x = value;
      }
      set ddy(value) {
        this.acceleration.y = value;
      }
      // @endif
      // --------------------------------------------------
      // ttl
      // --------------------------------------------------
      // @ifdef GAMEOBJECT_TTL
      /**
       * Check if the game object is alive.
       * @memberof GameObject
       * @function isAlive
       * @page GameObject
       *
       * @returns {Boolean} `true` if the game objects [ttl](api/gameObject#ttl) property is above `0`, `false` otherwise.
       */
      isAlive() {
        return this.ttl > 0;
      }
      // @endif
      _pc() {
      }
    }
    class GameObject extends Updatable {
      /**
       * @docs docs/api_docs/gameObject.js
       */
      /**
       * Use this function to reinitialize a game object. It takes the same properties object as the constructor. Useful it you want to repurpose a game object.
       * @memberof GameObject
       * @function init
       *
       * @param {Object} properties - Properties of the game object.
       */
      init({
        // --------------------------------------------------
        // defaults
        // --------------------------------------------------
        /**
         * The width of the game object. Represents the local width of the object as opposed to the [world](api/gameObject#world) width.
         * @memberof GameObject
         * @property {Number} width
         */
        width = 0,
        /**
         * The height of the game object. Represents the local height of the object as opposed to the [world](api/gameObject#world) height.
         * @memberof GameObject
         * @property {Number} height
         */
        height = 0,
        /**
         * The context the game object will draw to.
         * @memberof GameObject
         * @property {CanvasRenderingContext2D} context
         */
        context: context2 = getContext(),
        render = this.draw,
        update = this.advance,
        // --------------------------------------------------
        // optionals
        // --------------------------------------------------
        // @ifdef GAMEOBJECT_GROUP
        /**
         * The game objects parent object.
         * @memberof GameObject
         * @property {GameObject|null} parent
         */
        /**
         * The game objects children objects.
         * @memberof GameObject
         * @property {GameObject[]} children
         */
        children = [],
        // @endif
        // @ifdef GAMEOBJECT_ANCHOR
        /**
         * The x and y origin of the game object. {x:0, y:0} is the top left corner of the game object, {x:1, y:1} is the bottom right corner.
         * @memberof GameObject
         * @property {{x: Number, y: Number}} anchor
         *
         * @example
         * // exclude-code:start
         * let { GameObject } = kontra;
         * // exclude-code:end
         * // exclude-script:start
         * import { GameObject } from 'kontra';
         * // exclude-script:end
         *
         * let gameObject = GameObject({
         *   x: 150,
         *   y: 100,
         *   width: 50,
         *   height: 50,
         *   color: 'red',
         *   // exclude-code:start
         *   context: context,
         *   // exclude-code:end
         *   render: function() {
         *     this.context.fillStyle = this.color;
         *     this.context.fillRect(0, 0, this.height, this.width);
         *   }
         * });
         *
         * function drawOrigin(gameObject) {
         *   gameObject.context.fillStyle = 'yellow';
         *   gameObject.context.beginPath();
         *   gameObject.context.arc(gameObject.x, gameObject.y, 3, 0, 2*Math.PI);
         *   gameObject.context.fill();
         * }
         *
         * gameObject.render();
         * drawOrigin(gameObject);
         *
         * gameObject.anchor = {x: 0.5, y: 0.5};
         * gameObject.x = 300;
         * gameObject.render();
         * drawOrigin(gameObject);
         *
         * gameObject.anchor = {x: 1, y: 1};
         * gameObject.x = 450;
         * gameObject.render();
         * drawOrigin(gameObject);
         */
        anchor = { x: 0, y: 0 },
        // @endif
        // @ifdef GAMEOBJECT_OPACITY
        /**
         * The opacity of the object. Represents the local opacity of the object as opposed to the [world](api/gameObject#world) opacity.
         * @memberof GameObject
         * @property {Number} opacity
         */
        opacity = 1,
        // @endif
        // @ifdef GAMEOBJECT_ROTATION
        /**
         * The rotation of the game object around the anchor in radians. Represents the local rotation of the object as opposed to the [world](api/gameObject#world) rotation.
         * @memberof GameObject
         * @property {Number} rotation
         */
        rotation = 0,
        // @endif
        // @ifdef GAMEOBJECT_SCALE
        /**
         * The x scale of the object. Represents the local x scale of the object as opposed to the [world](api/gameObject#world) x scale.
         * @memberof GameObject
         * @property {Number} scaleX
         */
        scaleX = 1,
        /**
         * The y scale of the object. Represents the local y scale of the object as opposed to the [world](api/gameObject#world) y scale.
         * @memberof GameObject
         * @property {Number} scaleY
         */
        scaleY = 1,
        // @endif
        ...props
      } = {}) {
        this._c = [];
        super.init({
          width,
          height,
          context: context2,
          // @ifdef GAMEOBJECT_ANCHOR
          anchor,
          // @endif
          // @ifdef GAMEOBJECT_OPACITY
          opacity,
          // @endif
          // @ifdef GAMEOBJECT_ROTATION
          rotation,
          // @endif
          // @ifdef GAMEOBJECT_SCALE
          scaleX,
          scaleY,
          // @endif
          ...props
        });
        this._di = true;
        this._uw();
        this.addChild(children);
        this._rf = render;
        this._uf = update;
        on("init", () => {
          this.context ??= getContext();
        });
      }
      /**
       * Update all children
       */
      update(dt) {
        this._uf(dt);
        this.children.map((child) => child.update && child.update(dt));
      }
      /**
       * Render the game object and all children. Calls the game objects [draw()](api/gameObject#draw) function.
       * @memberof GameObject
       * @function render
       */
      render() {
        let context2 = this.context;
        context2.save();
        if (this.x || this.y) {
          context2.translate(this.x, this.y);
        }
        if (this.rotation) {
          context2.rotate(this.rotation);
        }
        if (this.scaleX != 1 || this.scaleY != 1) {
          context2.scale(this.scaleX, this.scaleY);
        }
        let anchorX = -this.width * this.anchor.x;
        let anchorY = -this.height * this.anchor.y;
        if (anchorX || anchorY) {
          context2.translate(anchorX, anchorY);
        }
        this.context.globalAlpha = this.opacity;
        this._rf();
        if (anchorX || anchorY) {
          context2.translate(-anchorX, -anchorY);
        }
        let children = this.children;
        children.map((child) => child.render && child.render());
        context2.restore();
      }
      /**
       * Draw the game object at its X and Y position, taking into account rotation, scale, and anchor.
       *
       * Do note that the canvas has been rotated and translated to the objects position (taking into account anchor), so {0,0} will be the top-left corner of the game object when drawing.
       *
       * If you override the game objects `render()` function with your own render function, you can call this function to draw the game object normally.
       *
       * ```js
       * let { GameObject } = kontra;
       *
       * let gameObject = GameObject({
       *  x: 290,
       *  y: 80,
       *  width: 20,
       *  height: 40,
       *
       *  render: function() {
       *    // draw the game object normally (perform rotation and other transforms)
       *    this.draw();
       *
       *    // outline the game object
       *    this.context.strokeStyle = 'yellow';
       *    this.context.lineWidth = 2;
       *    this.context.strokeRect(0, 0, this.width, this.height);
       *  }
       * });
       *
       * gameObject.render();
       * ```
       * @memberof GameObject
       * @function draw
       */
      draw() {
      }
      /**
       * Sync property changes from the parent to the child
       */
      _pc() {
        this._uw();
        this.children.map((child) => child._pc());
      }
      /**
       * X coordinate of the position vector.
       * @memberof GameObject
       * @property {Number} x
       */
      get x() {
        return this.position.x;
      }
      /**
       * Y coordinate of the position vector.
       * @memberof GameObject
       * @property {Number} y
       */
      get y() {
        return this.position.y;
      }
      set x(value) {
        this.position.x = value;
        this._pc();
      }
      set y(value) {
        this.position.y = value;
        this._pc();
      }
      get width() {
        return this._w;
      }
      set width(value) {
        this._w = value;
        this._pc();
      }
      get height() {
        return this._h;
      }
      set height(value) {
        this._h = value;
        this._pc();
      }
      /**
       * Update world properties
       */
      _uw() {
        if (!this._di)
          return;
        let {
          _wx = 0,
          _wy = 0,
          // @ifdef GAMEOBJECT_OPACITY
          _wo = 1,
          // @endif
          // @ifdef GAMEOBJECT_ROTATION
          _wr = 0,
          // @endif
          // @ifdef GAMEOBJECT_SCALE
          _wsx = 1,
          _wsy = 1
          // @endif
        } = this.parent || {};
        this._wx = this.x;
        this._wy = this.y;
        this._ww = this.width;
        this._wh = this.height;
        this._wo = _wo * this.opacity;
        this._wsx = _wsx * this.scaleX;
        this._wsy = _wsy * this.scaleY;
        this._wx = this._wx * _wsx;
        this._wy = this._wy * _wsy;
        this._ww = this.width * this._wsx;
        this._wh = this.height * this._wsy;
        this._wr = _wr + this.rotation;
        let { x, y } = rotatePoint({ x: this._wx, y: this._wy }, _wr);
        this._wx = x;
        this._wy = y;
        this._wx += _wx;
        this._wy += _wy;
      }
      /**
       * The world position, width, height, opacity, rotation, and scale. The world property is the true position, width, height, etc. of the object, taking into account all parents.
       *
       * The world property does not adjust for anchor or scale, so if you set a negative scale the world width or height could be negative. Use [getWorldRect](/api/helpers#getWorldRect) to get the world position and size adjusted for anchor and scale.
       * @property {{x: Number, y: Number, width: Number, height: Number, opacity: Number, rotation: Number, scaleX: Number, scaleY: Number}} world
       * @memberof GameObject
       */
      get world() {
        return {
          x: this._wx,
          y: this._wy,
          width: this._ww,
          height: this._wh,
          // @ifdef GAMEOBJECT_OPACITY
          opacity: this._wo,
          // @endif
          // @ifdef GAMEOBJECT_ROTATION
          rotation: this._wr,
          // @endif
          // @ifdef GAMEOBJECT_SCALE
          scaleX: this._wsx,
          scaleY: this._wsy
          // @endif
        };
      }
      // --------------------------------------------------
      // group
      // --------------------------------------------------
      // @ifdef GAMEOBJECT_GROUP
      set children(value) {
        this.removeChild(this._c);
        this.addChild(value);
      }
      get children() {
        return this._c;
      }
      /**
       * Add an object as a child to this object. The objects position, size, and rotation will be relative to the parents position, size, and rotation. The childs [world](api/gameObject#world) property will be updated to take into account this object and all of its parents.
       * @memberof GameObject
       * @function addChild
       *
       * @param {...(GameObject|GameObject[])[]} objects - Object to add as a child. Can be a single object, an array of objects, or a comma-separated list of objects.
       *
       * @example
       * // exclude-code:start
       * let { GameObject } = kontra;
       * // exclude-code:end
       * // exclude-script:start
       * import { GameObject } from 'kontra';
       * // exclude-script:end
       *
       * function createObject(x, y, color, size = 1) {
       *   return GameObject({
       *     x,
       *     y,
       *     width: 50 / size,
       *     height: 50 / size,
       *     anchor: {x: 0.5, y: 0.5},
       *     color,
       *     // exclude-code:start
       *     context: context,
       *     // exclude-code:end
       *     render: function() {
       *       this.context.fillStyle = this.color;
       *       this.context.fillRect(0, 0, this.height, this.width);
       *     }
       *   });
       * }
       *
       * let parent = createObject(300, 100, 'red');
       *
       * // create a child that is 25px to the right and
       * // down from the parents position
       * let child = createObject(25, 25, 'yellow', 2);
       *
       * parent.addChild(child);
       *
       * parent.render();
       */
      addChild(...objects) {
        objects.flat().map((child) => {
          this.children.push(child);
          child.parent = this;
          child._pc = child._pc || noop;
          child._pc();
        });
      }
      /**
       * Remove an object as a child of this object. The removed objects [world](api/gameObject#world) property will be updated to not take into account this object and all of its parents.
       * @memberof GameObject
       * @function removeChild
       *
       * @param {...(GameObject|GameObject[])[]} objects - Object to remove as a child. Can be a single object, an array of objects, or a comma-separated list of objects.
       */
      removeChild(...objects) {
        objects.flat().map((child) => {
          if (removeFromArray(this.children, child)) {
            child.parent = null;
            child._pc();
          }
        });
      }
      // @endif
      // --------------------------------------------------
      // opacity
      // --------------------------------------------------
      // @ifdef GAMEOBJECT_OPACITY
      get opacity() {
        return this._opa;
      }
      set opacity(value) {
        this._opa = clamp(0, 1, value);
        this._pc();
      }
      // @endif
      // --------------------------------------------------
      // rotation
      // --------------------------------------------------
      // @ifdef GAMEOBJECT_ROTATION
      get rotation() {
        return this._rot;
      }
      set rotation(value) {
        this._rot = value;
        this._pc();
      }
      // @endif
      // --------------------------------------------------
      // scale
      // --------------------------------------------------
      // @ifdef GAMEOBJECT_SCALE
      /**
       * Set the x and y scale of the object. If only one value is passed, both are set to the same value.
       * @memberof GameObject
       * @function setScale
       *
       * @param {Number} x - X scale value.
       * @param {Number} [y=x] - Y scale value.
       */
      setScale(x, y = x) {
        this.scaleX = x;
        this.scaleY = y;
      }
      get scaleX() {
        return this._scx;
      }
      set scaleX(value) {
        this._scx = value;
        this._pc();
      }
      get scaleY() {
        return this._scy;
      }
      set scaleY(value) {
        this._scy = value;
        this._pc();
      }
      // @endif
    }
    function factory$9() {
      return new GameObject(...arguments);
    }
    class Sprite extends GameObject {
      /**
       * @docs docs/api_docs/sprite.js
       */
      init({
        /**
         * The color of the game object if it was passed as an argument.
         * @memberof Sprite
         * @property {String} color
         */
        // @ifdef SPRITE_IMAGE
        /**
         * The image the sprite will use when drawn if passed as an argument.
         * @memberof Sprite
         * @property {HTMLImageElement|HTMLCanvasElement} image
         */
        image,
        /**
         * The width of the sprite. If the sprite is a [rectangle sprite](api/sprite#rectangle-sprite), it uses the passed in value. For an [image sprite](api/sprite#image-sprite) it is the width of the image. And for an [animation sprite](api/sprite#animation-sprite) it is the width of a single frame of the animation.
         * @memberof Sprite
         * @property {Number} width
         */
        width = image ? image.width : void 0,
        /**
         * The height of the sprite. If the sprite is a [rectangle sprite](api/sprite#rectangle-sprite), it uses the passed in value. For an [image sprite](api/sprite#image-sprite) it is the height of the image. And for an [animation sprite](api/sprite#animation-sprite) it is the height of a single frame of the animation.
         * @memberof Sprite
         * @property {Number} height
         */
        height = image ? image.height : void 0,
        // @endif
        ...props
      } = {}) {
        super.init({
          // @ifdef SPRITE_IMAGE
          image,
          width,
          height,
          // @endif
          ...props
        });
      }
      // @ifdef SPRITE_ANIMATION
      /**
       * An object of [Animations](api/animation) from a [SpriteSheet](api/spriteSheet) to animate the sprite. Each animation is named so that it can can be used by name for the sprites [playAnimation()](api/sprite#playAnimation) function.
       *
       * ```js
       * import { Sprite, SpriteSheet } from 'kontra';
       *
       * let spriteSheet = SpriteSheet({
       *   // ...
       *   animations: {
       *     idle: {
       *       frames: 1,
       *       loop: false,
       *     },
       *     walk: {
       *       frames: [1,2,3]
       *     }
       *   }
       * });
       *
       * let sprite = Sprite({
       *   x: 100,
       *   y: 200,
       *   animations: spriteSheet.animations
       * });
       *
       * sprite.playAnimation('idle');
       * ```
       * @memberof Sprite
       * @property {{[name: String] : Animation}} animations
       */
      get animations() {
        return this._a;
      }
      set animations(value) {
        let prop, firstAnimation;
        this._a = {};
        for (prop in value) {
          this._a[prop] = value[prop].clone();
          firstAnimation = firstAnimation || this._a[prop];
        }
        this.currentAnimation = firstAnimation;
        this.width = this.width || firstAnimation.width;
        this.height = this.height || firstAnimation.height;
      }
      /**
       * Set the currently playing animation of an animation sprite.
       *
       * ```js
       * import { Sprite, SpriteSheet } from 'kontra';
       *
       * let spriteSheet = SpriteSheet({
       *   // ...
       *   animations: {
       *     idle: {
       *       frames: 1
       *     },
       *     walk: {
       *       frames: [1,2,3]
       *     }
       *   }
       * });
       *
       * let sprite = Sprite({
       *   x: 100,
       *   y: 200,
       *   animations: spriteSheet.animations
       * });
       *
       * sprite.playAnimation('idle');
       * ```
       * @memberof Sprite
       * @function playAnimation
       *
       * @param {String} name - Name of the animation to play.
       */
      playAnimation(name) {
        this.currentAnimation?.stop();
        this.currentAnimation = this.animations[name];
        this.currentAnimation.start();
      }
      advance(dt) {
        super.advance(dt);
        this.currentAnimation?.update(dt);
      }
      // @endif
      draw() {
        if (this.image) {
          this.context.drawImage(
            this.image,
            0,
            0,
            this.image.width,
            this.image.height
          );
        }
        if (this.currentAnimation) {
          this.currentAnimation.render({
            x: 0,
            y: 0,
            width: this.width,
            height: this.height,
            context: this.context
          });
        }
        if (this.color) {
          this.context.fillStyle = this.color;
          this.context.fillRect(0, 0, this.width, this.height);
        }
      }
    }
    function factory$8() {
      return new Sprite(...arguments);
    }
    let fontSizeRegex = /(\d+)(\w+)/;
    function parseFont(font) {
      if (!font)
        return { computed: 0 };
      let match = font.match(fontSizeRegex);
      let size = +match[1];
      let unit = match[2];
      let computed = size;
      return {
        size,
        unit,
        computed
      };
    }
    class Text extends GameObject {
      init({
        // --------------------------------------------------
        // defaults
        // --------------------------------------------------
        /**
         * The string of text. Use newline characters to create multi-line strings.
         * @memberof Text
         * @property {String} text
         */
        text = "",
        /**
         * The text alignment.
         * @memberof Text
         * @property {String} textAlign
         */
        textAlign = "",
        /**
         * The distance between two lines of text. The value is multiplied by the texts font size.
         * @memberof Text
         * @property {Number} lineHeight
         */
        lineHeight = 1,
        /**
         * The font style.
         * @memberof Text
         * @property {String} font
         */
        font = getContext()?.font,
        /**
         * The color of the text.
         * @memberof Text
         * @property {String} color
         */
        ...props
      } = {}) {
        text = "" + text;
        super.init({
          text,
          textAlign,
          lineHeight,
          font,
          ...props
        });
        if (this.context) {
          this._p();
        }
        on("init", () => {
          this.font ??= getContext().font;
          this._p();
        });
      }
      // keep width and height getters/settings so we can set _w and _h
      // and not trigger infinite call loops
      get width() {
        return this._w;
      }
      set width(value) {
        this._d = true;
        this._w = value;
        this._fw = value;
      }
      get text() {
        return this._t;
      }
      set text(value) {
        this._d = true;
        this._t = "" + value;
      }
      get font() {
        return this._f;
      }
      set font(value) {
        this._d = true;
        this._f = value;
        this._fs = parseFont(value).computed;
      }
      get lineHeight() {
        return this._lh;
      }
      set lineHeight(value) {
        this._d = true;
        this._lh = value;
      }
      render() {
        if (this._d) {
          this._p();
        }
        super.render();
      }
      /**
       * Calculate the font width, height, and text strings before rendering.
       */
      _p() {
        this._s = [];
        this._d = false;
        let context2 = this.context;
        let text = [this.text];
        context2.font = this.font;
        text = this.text.split("\n");
        if (this._fw) {
          text.map((t) => {
            let parts = t.split(" ");
            let str = parts.shift();
            let nextStr = str;
            parts.map((part) => {
              nextStr += " " + part;
              if (context2.measureText(nextStr).width > this._fw) {
                this._s.push(str);
                nextStr = part;
              }
              str = nextStr;
            });
            this._s.push(nextStr);
          });
        }
        if (!this._s.length && this.text.includes("\n")) {
          let width = 0;
          text.map((str) => {
            this._s.push(str);
            width = Math.max(width, context2.measureText(str).width);
          });
          this._w = this._fw || width;
        }
        if (!this._s.length) {
          this._s.push(this.text);
          this._w = this._fw || context2.measureText(this.text).width;
        }
        this.height = this._fs + (this._s.length - 1) * this._fs * this.lineHeight;
        this._uw();
      }
      draw() {
        let alignX = 0;
        let textAlign = this.textAlign;
        let context2 = this.context;
        textAlign = this.textAlign || (context2.canvas.dir == "rtl" ? "right" : "left");
        alignX = textAlign == "right" ? this.width : textAlign == "center" ? this.width / 2 | 0 : 0;
        this._s.map((str, index) => {
          context2.textBaseline = "top";
          context2.textAlign = textAlign;
          context2.fillStyle = this.color;
          context2.font = this.font;
          if (this.strokeColor) {
            context2.strokeStyle = this.strokeColor;
            context2.lineWidth = this.lineWidth ?? 1;
            context2.strokeText(
              str,
              alignX,
              this._fs * this.lineHeight * index
            );
          }
          context2.fillText(
            str,
            alignX,
            this._fs * this.lineHeight * index
          );
        });
      }
    }
    function factory$7() {
      return new Text(...arguments);
    }
    let pointers = /* @__PURE__ */ new WeakMap();
    let callbacks$1 = {};
    let pressedButtons = {};
    let pointerMap = {
      0: "left",
      1: "middle",
      2: "right"
    };
    function getPointer(canvas = getCanvas()) {
      return pointers.get(canvas);
    }
    function circleRectCollision(object, pointer) {
      let { x, y, width, height } = getWorldRect(object);
      do {
        x -= object.sx || 0;
        y -= object.sy || 0;
      } while (object = object.parent);
      let dx = pointer.x - Math.max(x, Math.min(pointer.x, x + width));
      let dy = pointer.y - Math.max(y, Math.min(pointer.y, y + height));
      return dx * dx + dy * dy < pointer.radius * pointer.radius;
    }
    function getCurrentObject(pointer) {
      let renderedObjects = pointer._lf.length ? pointer._lf : pointer._cf;
      for (let i = renderedObjects.length - 1; i >= 0; i--) {
        let object = renderedObjects[i];
        let collides2 = object.collidesWithPointer ? object.collidesWithPointer(pointer) : circleRectCollision(object, pointer);
        if (collides2) {
          return object;
        }
      }
    }
    function getPropValue(style, value) {
      return parseFloat(style.getPropertyValue(value)) || 0;
    }
    function getCanvasOffset(pointer) {
      let { canvas, _s } = pointer;
      let rect = canvas.getBoundingClientRect();
      let transform = _s.transform != "none" ? _s.transform.replace("matrix(", "").split(",") : [1, 1, 1, 1];
      let transformScaleX = parseFloat(transform[0]);
      let transformScaleY = parseFloat(transform[3]);
      let borderWidth = (getPropValue(_s, "border-left-width") + getPropValue(_s, "border-right-width")) * transformScaleX;
      let borderHeight = (getPropValue(_s, "border-top-width") + getPropValue(_s, "border-bottom-width")) * transformScaleY;
      let paddingWidth = (getPropValue(_s, "padding-left") + getPropValue(_s, "padding-right")) * transformScaleX;
      let paddingHeight = (getPropValue(_s, "padding-top") + getPropValue(_s, "padding-bottom")) * transformScaleY;
      return {
        scaleX: (rect.width - borderWidth - paddingWidth) / canvas.width,
        scaleY: (rect.height - borderHeight - paddingHeight) / canvas.height,
        offsetX: rect.left + (getPropValue(_s, "border-left-width") + getPropValue(_s, "padding-left")) * transformScaleX,
        offsetY: rect.top + (getPropValue(_s, "border-top-width") + getPropValue(_s, "padding-top")) * transformScaleY
      };
    }
    function pointerDownHandler(evt) {
      let button = evt.button != null ? pointerMap[evt.button] : "left";
      pressedButtons[button] = true;
      pointerHandler(evt, "onDown");
    }
    function pointerUpHandler(evt) {
      let button = evt.button != null ? pointerMap[evt.button] : "left";
      pressedButtons[button] = false;
      pointerHandler(evt, "onUp");
    }
    function mouseMoveHandler(evt) {
      pointerHandler(evt, "onOver");
    }
    function blurEventHandler$2(evt) {
      let pointer = pointers.get(evt.target);
      pointer._oo = null;
      pressedButtons = {};
    }
    function callCallback(pointer, eventName, evt) {
      let object = getCurrentObject(pointer);
      if (object && object[eventName]) {
        object[eventName](evt);
      }
      if (callbacks$1[eventName]) {
        callbacks$1[eventName](evt, object);
      }
      if (eventName == "onOver") {
        if (object != pointer._oo && pointer._oo && pointer._oo.onOut) {
          pointer._oo.onOut(evt);
        }
        pointer._oo = object;
      }
    }
    function pointerHandler(evt, eventName) {
      evt.preventDefault();
      let canvas = evt.target;
      let pointer = pointers.get(canvas);
      let { scaleX, scaleY, offsetX, offsetY } = getCanvasOffset(pointer);
      let isTouchEvent = evt.type.includes("touch");
      if (isTouchEvent) {
        Array.from(evt.touches).map(
          ({ clientX, clientY, identifier }) => {
            let touch = pointer.touches[identifier];
            if (!touch) {
              touch = pointer.touches[identifier] = {
                start: {
                  x: (clientX - offsetX) / scaleX,
                  y: (clientY - offsetY) / scaleY
                }
              };
              pointer.touches.length++;
            }
            touch.changed = false;
          }
        );
        Array.from(evt.changedTouches).map(
          ({ clientX, clientY, identifier }) => {
            let touch = pointer.touches[identifier];
            touch.changed = true;
            touch.x = pointer.x = (clientX - offsetX) / scaleX;
            touch.y = pointer.y = (clientY - offsetY) / scaleY;
            callCallback(pointer, eventName, evt);
            emit("touchChanged", evt, pointer.touches);
            if (eventName == "onUp") {
              delete pointer.touches[identifier];
              pointer.touches.length--;
              if (!pointer.touches.length) {
                emit("touchEnd");
              }
            }
          }
        );
      } else {
        pointer.x = (evt.clientX - offsetX) / scaleX;
        pointer.y = (evt.clientY - offsetY) / scaleY;
        callCallback(pointer, eventName, evt);
      }
    }
    function initPointer({
      radius = 5,
      canvas = getCanvas()
    } = {}) {
      let pointer = pointers.get(canvas);
      if (!pointer) {
        let style = window.getComputedStyle(canvas);
        pointer = {
          x: 0,
          y: 0,
          radius,
          touches: { length: 0 },
          canvas,
          // cf = current frame, lf = last frame, o = objects,
          // oo = over object, _s = style
          _cf: [],
          _lf: [],
          _o: [],
          _oo: null,
          _s: style
        };
        pointers.set(canvas, pointer);
      }
      canvas.addEventListener("mousedown", pointerDownHandler);
      canvas.addEventListener("touchstart", pointerDownHandler);
      canvas.addEventListener("mouseup", pointerUpHandler);
      canvas.addEventListener("touchend", pointerUpHandler);
      canvas.addEventListener("touchcancel", pointerUpHandler);
      canvas.addEventListener("blur", blurEventHandler$2);
      canvas.addEventListener("mousemove", mouseMoveHandler);
      canvas.addEventListener("touchmove", mouseMoveHandler);
      if (!pointer._t) {
        pointer._t = true;
        on("tick", () => {
          pointer._lf.length = 0;
          pointer._cf.map((object) => {
            pointer._lf.push(object);
          });
          pointer._cf.length = 0;
        });
      }
      return pointer;
    }
    function track(...objects) {
      objects.flat().map((object) => {
        let canvas = object.context ? object.context.canvas : getCanvas();
        let pointer = pointers.get(canvas);
        if (!pointer) {
          throw new ReferenceError(
            "Pointer events not initialized for the objects canvas"
          );
        }
        if (!object._r) {
          object._r = object.render;
          object.render = function() {
            pointer._cf.push(this);
            this._r();
          };
          pointer._o.push(object);
        }
      });
    }
    function untrack(...objects) {
      objects.flat().map((object) => {
        let canvas = object.context ? object.context.canvas : getCanvas();
        let pointer = pointers.get(canvas);
        if (!pointer) {
          throw new ReferenceError(
            "Pointer events not initialized for the objects canvas"
          );
        }
        object.render = object._r;
        object._r = 0;
        removeFromArray(pointer._o, object);
      });
    }
    function pointerOver(object) {
      let canvas = object.context ? object.context.canvas : getCanvas();
      let pointer = pointers.get(canvas);
      if (!pointer) {
        throw new ReferenceError(
          "Pointer events not initialized for the objects canvas"
        );
      }
      return pointer._o.includes(object) && /* eslint-disable-next-line no-restricted-syntax */
      getCurrentObject(pointer) === object;
    }
    function onPointer(direction, callback) {
      let eventName = direction[0].toUpperCase() + direction.substr(1);
      callbacks$1["on" + eventName] = callback;
    }
    function offPointer(direction) {
      let eventName = direction[0].toUpperCase() + direction.substr(1);
      callbacks$1["on" + eventName] = 0;
    }
    function pointerPressed(button) {
      return !!pressedButtons[button];
    }
    class Button extends Sprite {
      /**
       * @docs docs/api_docs/button.js
       */
      init({
        /**
         * The horizontal padding. This will be added to the width to give the final width of the button.
         * @memberof Button
         * @property {Number} padX
         */
        padX = 0,
        /**
         * The vertical padding. This will be added to the height to give the final height of the button.
         * @memberof Button
         * @property {Number} padY
         */
        padY = 0,
        text,
        disabled = false,
        onDown,
        onUp,
        ...props
      } = {}) {
        super.init({
          padX,
          padY,
          ...props
        });
        this.textNode = factory$7({
          ...text,
          // ensure the text uses the same context as the button
          context: this.context
        });
        if (!this.width) {
          this.width = this.textNode.width;
          this.height = this.textNode.height;
        }
        track(this);
        this.addChild(this.textNode);
        this._od = onDown || noop;
        this._ou = onUp || noop;
        let button = this._dn = document.createElement("button");
        button.style = srOnlyStyle;
        button.textContent = this.text;
        if (disabled) {
          this.disable();
        }
        button.addEventListener("focus", () => this.focus());
        button.addEventListener("blur", () => this.blur());
        button.addEventListener("keydown", (evt) => this._kd(evt));
        button.addEventListener("keyup", (evt) => this._ku(evt));
        addToDom(button, this.context.canvas);
        this._uw();
        this._p();
      }
      /**
       * The text property of the Text object.
       * @memberof Button
       * @property {String} text
       */
      get text() {
        return this.textNode.text;
      }
      set text(value) {
        this._d = true;
        this.textNode.text = value;
      }
      /**
       * Clean up the button by removing the HTMLButtonElement from the DOM.
       * @memberof Button
       * @function destroy
       */
      destroy() {
        this._dn.remove();
      }
      _p() {
        if (this.text != this._dn.textContent) {
          this._dn.textContent = this.text;
        }
        this.textNode._p();
        let width = this.textNode.width + this.padX * 2;
        let height = this.textNode.height + this.padY * 2;
        this.width = Math.max(width, this.width);
        this.height = Math.max(height, this.height);
        this._uw();
      }
      render() {
        if (this._d) {
          this._p();
        }
        super.render();
      }
      /**
       * Enable the button. Calls [onEnable](api/button#onEnable) if passed.
       * @memberof Button
       * @function enable
       */
      enable() {
        this.disabled = this._dn.disabled = false;
        this.onEnable();
      }
      /**
       * Disable the button. A disabled button will not longer render nor respond to pointer and keyboard events. Calls [onDisable](api/button#onDisable) if passed.
       * @memberof Button
       * @function disable
       */
      disable() {
        this.disabled = this._dn.disabled = true;
        this.onDisable();
      }
      /**
       * Focus the button. Calls [onFocus](api/button#onFocus) if passed.
       * @memberof Button
       * @function focus
       */
      focus() {
        if (!this.disabled) {
          this.focused = true;
          if (document.activeElement != this._dn)
            this._dn.focus();
          this.onFocus();
        }
      }
      /**
       * Blur the button. Calls [onBlur](api/button#onBlur) if passed.
       * @memberof Button
       * @function blur
       */
      blur() {
        this.focused = false;
        if (document.activeElement == this._dn)
          this._dn.blur();
        this.onBlur();
      }
      onOver() {
        if (!this.disabled) {
          this.hovered = true;
        }
      }
      onOut() {
        this.hovered = false;
      }
      /**
       * Function called when then button is enabled. Override this function to have the button do something when enabled.
       * @memberof Button
       * @function onEnable
       */
      onEnable() {
      }
      /**
       * Function called when then button is disabled. Override this function to have the button do something when disabled.
       * @memberof Button
       * @function onDisable
       */
      onDisable() {
      }
      /**
       * Function called when then button is focused. Override this function to have the button do something when focused.
       * @memberof Button
       * @function onFocus
       */
      onFocus() {
      }
      /**
       * Function called when then button is blurred. Override this function to have the button do something when blurred.
       * @memberof Button
       * @function onBlur
       */
      onBlur() {
      }
      onDown() {
        if (!this.disabled) {
          this.pressed = true;
          this._od();
        }
      }
      onUp() {
        if (!this.disabled) {
          this.pressed = false;
          this._ou();
        }
      }
      // kd = keydown
      _kd(evt) {
        if (evt.code == "Enter" || evt.code == "Space") {
          this.onDown();
        }
      }
      // kd = keydown
      _ku(evt) {
        if (evt.code == "Enter" || evt.code == "Space") {
          this.onUp();
        }
      }
    }
    function factory$6() {
      return new Button(...arguments);
    }
    function clear(context2) {
      let canvas = context2.canvas;
      context2.clearRect(0, 0, canvas.width, canvas.height);
    }
    function GameLoop({
      fps = 60,
      clearCanvas = true,
      update = noop,
      render,
      context: context2 = getContext(),
      blur = false
    } = {}) {
      if (!render) {
        throw Error("You must provide a render() function");
      }
      let accumulator = 0;
      let delta = 1e3 / fps;
      let step = 1 / fps;
      let clearFn = clearCanvas ? clear : noop;
      let last, rAF, now, dt, loop;
      let focused = true;
      if (!blur) {
        window.addEventListener("focus", () => {
          focused = true;
        });
        window.addEventListener("blur", () => {
          focused = false;
        });
      }
      on("init", () => {
        loop.context ??= getContext();
      });
      function frame() {
        rAF = requestAnimationFrame(frame);
        if (!focused)
          return;
        now = performance.now();
        dt = now - last;
        last = now;
        if (dt > 1e3) {
          return;
        }
        emit("tick");
        accumulator += dt;
        while (accumulator >= delta) {
          loop.update(step);
          accumulator -= delta;
        }
        clearFn(loop.context);
        loop.render();
      }
      loop = {
        /**
         * Called every frame to update the game. Put all of your games update logic here.
         * @memberof GameLoop
         * @function update
         *
         * @param {Number} [dt] - The fixed dt time of 1/60 of a frame.
         */
        update,
        /**
         * Called every frame to render the game. Put all of your games render logic here.
         * @memberof GameLoop
         * @function render
         */
        render,
        /**
         * If the game loop is currently stopped.
         *
         * ```js
         * import { GameLoop } from 'kontra';
         *
         * let loop = GameLoop({
         *   // ...
         * });
         * console.log(loop.isStopped);  //=> true
         *
         * loop.start();
         * console.log(loop.isStopped);  //=> false
         *
         * loop.stop();
         * console.log(loop.isStopped);  //=> true
         * ```
         * @memberof GameLoop
         * @property {Boolean} isStopped
         */
        isStopped: true,
        /**
         * The context the game loop will clear. Defaults to [core.getContext()](api/core#getCcontext).
         *
         * @memberof GameLoop
         * @property {CanvasRenderingContext2D} context
         */
        context: context2,
        /**
         * Start the game loop.
         * @memberof GameLoop
         * @function start
         */
        start() {
          last = performance.now();
          this.isStopped = false;
          requestAnimationFrame(frame);
        },
        /**
         * Stop the game loop.
         * @memberof GameLoop
         * @function stop
         */
        stop() {
          this.isStopped = true;
          cancelAnimationFrame(rAF);
        },
        // expose properties for testing
        // @ifdef DEBUG
        _frame: frame,
        set _last(value) {
          last = value;
        }
        // @endif
      };
      return loop;
    }
    let gamepads = [];
    let gamepaddownCallbacks = {};
    let gamepadupCallbacks = {};
    let gamepadMap = {
      0: "south",
      1: "east",
      2: "west",
      3: "north",
      4: "leftshoulder",
      5: "rightshoulder",
      6: "lefttrigger",
      7: "righttrigger",
      8: "select",
      9: "start",
      10: "leftstick",
      11: "rightstick",
      12: "dpadup",
      13: "dpaddown",
      14: "dpadleft",
      15: "dpadright"
    };
    function gamepadConnectedHandler(event) {
      gamepads[event.gamepad.index] = {
        pressedButtons: {},
        axes: {}
      };
    }
    function gamepadDisconnectedHandler(event) {
      delete gamepads[event.gamepad.index];
    }
    function blurEventHandler$1() {
      gamepads.map((gamepad) => {
        gamepad.pressedButtons = {};
        gamepad.axes = {};
      });
    }
    function updateGamepad() {
      let pads = navigator.getGamepads ? navigator.getGamepads() : navigator.webkitGetGamepads ? navigator.webkitGetGamepads : [];
      for (let i = 0; i < pads.length; i++) {
        let gamepad = pads[i];
        if (!gamepad) {
          continue;
        }
        gamepad.buttons.map((button, index) => {
          let buttonName = gamepadMap[index];
          let { pressed } = button;
          let { pressedButtons: pressedButtons2 } = gamepads[gamepad.index];
          let state = pressedButtons2[buttonName];
          if (!state && pressed) {
            [
              gamepaddownCallbacks[gamepad.index],
              gamepaddownCallbacks
            ].map((callback) => {
              callback?.[buttonName]?.(gamepad, button, buttonName);
            });
          } else if (state && !pressed) {
            [gamepadupCallbacks[gamepad.index], gamepadupCallbacks].map(
              (callback) => {
                callback?.[buttonName]?.(gamepad, button, buttonName);
              }
            );
          }
          pressedButtons2[buttonName] = pressed;
        });
        let { axes } = gamepads[gamepad.index];
        axes.leftstickx = gamepad.axes[0];
        axes.leftsticky = gamepad.axes[1];
        axes.rightstickx = gamepad.axes[2];
        axes.rightsticky = gamepad.axes[3];
      }
    }
    function initGamepad() {
      window.addEventListener(
        "gamepadconnected",
        gamepadConnectedHandler
      );
      window.addEventListener(
        "gamepaddisconnected",
        gamepadDisconnectedHandler
      );
      window.addEventListener("blur", blurEventHandler$1);
      on("tick", updateGamepad);
    }
    function onGamepad(buttons, callback, { gamepad, handler: handler2 = "gamepaddown" } = {}) {
      let callbacks2 = handler2 == "gamepaddown" ? gamepaddownCallbacks : gamepadupCallbacks;
      [].concat(buttons).map((button) => {
        if (isNaN(gamepad)) {
          callbacks2[button] = callback;
        } else {
          callbacks2[gamepad] = callbacks2[gamepad] || {};
          callbacks2[gamepad][button] = callback;
        }
      });
    }
    function offGamepad(buttons, { gamepad, handler: handler2 = "gamepaddown" } = {}) {
      let callbacks2 = handler2 == "gamepaddown" ? gamepaddownCallbacks : gamepadupCallbacks;
      [].concat(buttons).map((button) => {
        if (isNaN(gamepad)) {
          delete callbacks2[button];
        } else {
          callbacks2[gamepad] = callbacks2[gamepad] || {};
          delete callbacks2[gamepad][button];
        }
      });
    }
    function gamepadPressed(button, { gamepad } = {}) {
      if (isNaN(gamepad)) {
        return gamepads.some((pad) => pad.pressedButtons[button]);
      }
      if (gamepads[gamepad]) {
        return !!gamepads[gamepad].pressedButtons[button];
      }
      return false;
    }
    function gamepadAxis(name, gamepad) {
      return gamepads[gamepad]?.axes[name] || 0;
    }
    let callbacks = {};
    let currGesture;
    let init = false;
    let gestureMap = {
      swipe: {
        touches: 1,
        threshold: 10,
        touchend({ 0: touch }) {
          let x = touch.x - touch.start.x;
          let y = touch.y - touch.start.y;
          let absX = Math.abs(x);
          let absY = Math.abs(y);
          if (absX < this.threshold && absY < this.threshold)
            return;
          return absX > absY ? x < 0 ? "left" : "right" : y < 0 ? "up" : "down";
        }
      },
      pinch: {
        touches: 2,
        threshold: 2,
        touchstart({ 0: touch0, 1: touch1 }) {
          this.prevDist = Math.hypot(
            touch0.x - touch1.x,
            touch0.y - touch1.y
          );
        },
        touchmove({ 0: touch0, 1: touch1 }) {
          let dist = Math.hypot(touch0.x - touch1.x, touch0.y - touch1.y);
          if (Math.abs(dist - this.prevDist) < this.threshold)
            return;
          let dir = dist > this.prevDist ? "out" : "in";
          this.prevDist = dist;
          return dir;
        }
      }
    };
    function initGesture() {
      if (!init) {
        init = true;
        on("touchChanged", (evt, touches) => {
          Object.keys(gestureMap).map((name) => {
            let gesture = gestureMap[name];
            let type;
            if (
              // don't call swipe if at the end of a pinch and there's 1
              // finger left touching
              (!currGesture || currGesture == name) && touches.length == gesture.touches && // ensure that the indices of touches goes from 0..N.
              // otherwise a length 1 touch could have an index of 2
              // which means there were two other touches that started
              // a gesture
              // @see https://stackoverflow.com/a/33352604/2124254
              [...Array(touches.length).keys()].every(
                (key) => touches[key]
              ) && (type = gesture[evt.type]?.(touches) ?? "") && callbacks[name + type]
            ) {
              currGesture = name;
              callbacks[name + type](evt, touches);
            }
          });
        });
        on("touchEnd", () => {
          currGesture = 0;
        });
      }
    }
    function onGesture(gestures, callback) {
      [].concat(gestures).map((gesture) => {
        callbacks[gesture] = callback;
      });
    }
    function offGesture(gestures) {
      [].concat(gestures).map((gesture) => {
        callbacks[gesture] = 0;
      });
    }
    let handler = {
      set(obj, prop, value) {
        if (!prop.startsWith("_")) {
          obj._d = true;
        }
        return Reflect.set(obj, prop, value);
      }
    };
    let alignment = {
      start(rtl) {
        return rtl ? 1 : 0;
      },
      center() {
        return 0.5;
      },
      end(rtl) {
        return rtl ? 0 : 1;
      }
    };
    class Grid extends GameObject {
      /**
       * @docs docs/api_docs/grid.js
       */
      init({
        /**
         * How to organize all objects in the grid. Valid values are:
         *
         * - `column` - organize into a single column
         * - `row` - organize into a single row
         * - `grid` - organize into a grid with [numCols](api/grid#numCols) number of columns
         * @memberof Grid
         * @property {String} flow
         */
        flow = "column",
        /**
         * The vertical alignment of the grid. Valid values are:
         *
         * - `start` - align to the top of row
         * - `center` - align to the center of the row
         * - `end` - align to the the bottom of the row
         *
         * An array of strings means the grid will set the vertical alignment for each row using the order of the array. For example, if the alignment is set to be `['end', 'start']`, then every odd row will use 'end' and every even row will use 'start'.
         *
         * Additionally, each child of the grid can use the `alignSelf` property to change it's alignment in the grid.
         * @memberof Grid
         * @property {String|String[]} align
         */
        align = "start",
        /**
         * The horizontal alignment of the grid. Valid values are:
         *
         * - `start` - align to the left of column
         * - `center` - align to the center of the column
         * - `end` - align to the the right of the column
         *
         * An array of strings means the grid will set the horizontal alignment for each column using the order of the array. For example, if the alignment is set to be `['end', 'start']`, then every odd column will use 'end' and every even column will use 'start'.
         *
         * If the [dir](api/grid#dir) property is set to `rtl`, then `start` and `end` are reversed.
         *
         * Additionally, each child of the grid can use the `justifySelf` property to change it's alignment in the grid.
         * @memberof Grid
         * @property {String|String[]} justify
         */
        justify = "start",
        /**
         * The horizontal gap between each column in the grid.
         *
         * An array of numbers means the grid will set the gap between columns using the order of the array. For example, if the gap is set to be `[10, 5]`, then every odd column gap will use 10 and every even column gap will use 5.
         * @memberof Grid
         * @property {Number|Number[]} colGap
         */
        colGap = 0,
        /**
         * The vertical gap between each row in the grid.
         *
         * An array of numbers means the grid will set the gap between rows using the order of the array. For example, if the gap is set to be `[10, 5]`, then every odd row gap will use 10 and every even row gap will use 5.
         * @memberof Grid
         * @property {Number|Number[]} rowGap
         */
        rowGap = 0,
        /**
         * The number of columns in the grid. Only applies if the [flow](api/grid#flow) property is set to `grid`.
         * @memberof Grid
         * @property {Number} numCols
         */
        numCols = 1,
        /**
         * The direction of the grid. Defaults to organizing the grid objects left-to-right, but if set to `rtl` then the grid is organized right-to-left.
         *
         * When determining the direction of the grid, the canvas `dir` attribute is also taken into account. Setting the attribute to `rtl` is equivalent to setting the `dir` property to `rtl`. The `dir` property is used instead of the canvas attribute if both are set.
         * @memberof Grid
         * @property {String} dir
         */
        dir = "",
        /**
         * How the grid should change based on different metrics. Based on the concept of CSS Media Queries so you can update how the grid organizes the objects when things change (such as the scale).
         *
         * Each object in the array uses the `metric()` function to determine when the breakpoint applies and the `callback()` function is called to change any properties of the grid.
         *
         * ```js
         * let { Grid } = kontra;
         *
         * let grid = Grid({
         *   breakpoints: [{
         *     metric() {
         *       return this.scaleX < 1
         *     },
         *     callback() {
         *       this.numCols = 1;
         *     }
         *   },
         *   {
         *     metric() {
         *       return this.scaleX >= 1
         *     },
         *     callback() {
         *       this.numCols = 2;
         *     }
         *   }]
         * });
         * ```
         * @memberof Grid
         * @property {{metric: Function, callback: Function}[]} breakpoints
         */
        breakpoints = [],
        ...props
      } = {}) {
        super.init({
          flow,
          align,
          justify,
          colGap,
          rowGap,
          numCols,
          dir,
          breakpoints,
          ...props
        });
        this._p();
        return new Proxy(this, handler);
      }
      addChild(child) {
        this._d = true;
        super.addChild(child);
      }
      removeChild(child) {
        this._d = true;
        super.removeChild(child);
      }
      render() {
        if (this._d) {
          this._p();
        }
        super.render();
      }
      /**
       * Call `destroy()` on all children.
       * @memberof Grid
       * @function destroy
       */
      destroy() {
        this.children.map((child) => child.destroy && child.destroy());
      }
      /**
       * Build the grid and calculate its width and height
       */
      _p() {
        this._d = false;
        this.breakpoints.map((breakpoint) => {
          if (breakpoint.metric.call(this) && this._b !== breakpoint) {
            this._b = breakpoint;
            breakpoint.callback.call(this);
          }
        });
        let grid = this._g = [];
        let colWidths = this._cw = [];
        let rowHeights = this._rh = [];
        let children = this.children;
        let numCols = this._nc = this.flow == "column" ? 1 : this.flow == "row" ? children.length : this.numCols;
        let row = 0;
        let col = 0;
        for (let i = 0, child; child = children[i]; i++) {
          grid[row] = grid[row] || [];
          if (child._p) {
            child._p();
          }
          let { width, height } = child.world || child;
          rowHeights[row] = Math.max(rowHeights[row] || 0, height);
          let spans = child.colSpan || 1;
          let colSpan = spans;
          do {
            colWidths[col] = Math.max(
              colWidths[col] || 0,
              width / colSpan
            );
            grid[row][col] = child;
          } while (col++ <= numCols && --spans);
          if (col >= numCols) {
            col = 0;
            row++;
          }
        }
        while (col > 0 && col < numCols) {
          grid[row][col++] = false;
        }
        let numRows = grid.length;
        let colGap = [].concat(this.colGap);
        let rowGap = [].concat(this.rowGap);
        this._w = colWidths.reduce((acc, width) => acc += width, 0);
        for (let i = 0; i < numCols - 1; i++) {
          this._w += colGap[i % colGap.length];
        }
        this._h = rowHeights.reduce((acc, height) => acc += height, 0);
        for (let i = 0; i < numRows - 1; i++) {
          this._h += rowGap[i % rowGap.length];
        }
        this._uw();
        let dir = this.context.canvas.dir;
        let rtl = dir == "rtl" && !this.dir || this.dir == "rtl";
        this._rtl = rtl;
        if (rtl) {
          this._g = grid.map((row2) => row2.reverse());
          this._cw = colWidths.reverse();
          colGap = colGap.reverse();
        }
        let topLeftY = -this.anchor.y * this.height;
        let rendered = [];
        let justify = [].concat(this.justify);
        let align = [].concat(this.align);
        this._g.map((gridRow, row2) => {
          let topLeftX = -this.anchor.x * this.width;
          gridRow.map((child, col2) => {
            if (child && !rendered.includes(child)) {
              rendered.push(child);
              let justifySelf = alignment[child.justifySelf || justify[col2 % justify.length]](this._rtl);
              let alignSelf = alignment[child.alignSelf || align[row2 % align.length]]();
              let colSpan = child.colSpan || 1;
              let colWidth = colWidths[col2];
              if (colSpan > 1 && col2 + colSpan <= this._nc) {
                for (let i = 1; i < colSpan; i++) {
                  colWidth += colWidths[col2 + i] + colGap[(col2 + i) % colGap.length];
                }
              }
              let pointX = colWidth * justifySelf;
              let pointY = rowHeights[row2] * alignSelf;
              let anchorX = 0;
              let anchorY = 0;
              let { width, height } = child.world || child;
              if (child.anchor) {
                anchorX = child.anchor.x;
                anchorY = child.anchor.y;
              }
              if (justifySelf == 0) {
                pointX = pointX + width * anchorX;
              } else if (justifySelf == 0.5) {
                let sign = anchorX < 0.5 ? -1 : anchorX == 0.5 ? 0 : 1;
                pointX = pointX + sign * width * justifySelf;
              } else {
                pointX = pointX - width * (1 - anchorX);
              }
              if (alignSelf == 0) {
                pointY = pointY + height * anchorY;
              } else if (alignSelf == 0.5) {
                let sign = anchorY < 0.5 ? -1 : anchorY == 0.5 ? 0 : 1;
                pointY = pointY + sign * height * alignSelf;
              } else {
                pointY = pointY - height * (1 - anchorY);
              }
              child.x = topLeftX + pointX;
              child.y = topLeftY + pointY;
            }
            topLeftX += colWidths[col2] + colGap[col2 % colGap.length];
          });
          topLeftY += rowHeights[row2] + rowGap[row2 % rowGap.length];
        });
      }
    }
    function factory$5() {
      return new Grid(...arguments);
    }
    let keydownCallbacks = {};
    let keyupCallbacks = {};
    let pressedKeys = {};
    let keyMap = {
      // named keys
      Enter: "enter",
      Escape: "esc",
      Space: "space",
      ArrowLeft: "arrowleft",
      ArrowUp: "arrowup",
      ArrowRight: "arrowright",
      ArrowDown: "arrowdown"
    };
    function call(callback = noop, evt) {
      if (callback._pd) {
        evt.preventDefault();
      }
      callback(evt);
    }
    function keydownEventHandler(evt) {
      let key = keyMap[evt.code];
      let callback = keydownCallbacks[key];
      pressedKeys[key] = true;
      call(callback, evt);
    }
    function keyupEventHandler(evt) {
      let key = keyMap[evt.code];
      let callback = keyupCallbacks[key];
      pressedKeys[key] = false;
      call(callback, evt);
    }
    function blurEventHandler() {
      pressedKeys = {};
    }
    function initKeys() {
      let i;
      for (i = 0; i < 26; i++) {
        keyMap["Key" + String.fromCharCode(i + 65)] = String.fromCharCode(
          i + 97
        );
      }
      for (i = 0; i < 10; i++) {
        keyMap["Digit" + i] = keyMap["Numpad" + i] = "" + i;
      }
      window.addEventListener("keydown", keydownEventHandler);
      window.addEventListener("keyup", keyupEventHandler);
      window.addEventListener("blur", blurEventHandler);
    }
    function onKey(keys, callback, { handler: handler2 = "keydown", preventDefault = true } = {}) {
      let callbacks2 = handler2 == "keydown" ? keydownCallbacks : keyupCallbacks;
      callback._pd = preventDefault;
      [].concat(keys).map((key) => callbacks2[key] = callback);
    }
    function offKey(keys, { handler: handler2 = "keydown" } = {}) {
      let callbacks2 = handler2 == "keydown" ? keydownCallbacks : keyupCallbacks;
      [].concat(keys).map((key) => delete callbacks2[key]);
    }
    function keyPressed(keys) {
      return !![].concat(keys).some((key) => pressedKeys[key]);
    }
    function contains(value, map) {
      return Object.values(map).includes(value);
    }
    function isGesture(value) {
      return Object.keys(gestureMap).some((name) => value.startsWith(name));
    }
    function initInput(options = {}) {
      initKeys();
      let pointer = initPointer(options.pointer);
      initGesture();
      initGamepad();
      return { pointer };
    }
    function onInput(inputs, callback, { gamepad, key } = {}) {
      [].concat(inputs).map((input) => {
        if (contains(input, gamepadMap)) {
          onGamepad(input, callback, gamepad);
        } else if (isGesture(input)) {
          onGesture(input, callback);
        } else if (contains(input, keyMap)) {
          onKey(input, callback, key);
        } else if (["down", "up"].includes(input)) {
          onPointer(input, callback);
        } else {
          throw new TypeError(`"${input}" is not a valid input name`);
        }
      });
    }
    function offInput(inputs, { gamepad, key } = {}) {
      [].concat(inputs).map((input) => {
        if (contains(input, gamepadMap)) {
          offGamepad(input, gamepad);
        } else if (isGesture(input)) {
          offGesture(input);
        } else if (contains(input, keyMap)) {
          offKey(input, key);
        } else if (["down", "up"].includes(input)) {
          offPointer(input);
        }
      });
    }
    function getMethod(methodName) {
      let methodTitle = methodName.substr(methodName.search(/[A-Z]/));
      return methodTitle[0].toLowerCase() + methodTitle.substr(1);
    }
    function registerPlugin(kontraObj, pluginObj) {
      let objectProto = kontraObj.prototype;
      if (!objectProto)
        return;
      if (!objectProto._inc) {
        objectProto._inc = {};
        objectProto._bInc = function beforePlugins(context2, method, ...args) {
          return this._inc[method].before.reduce((acc, fn) => {
            let newArgs = fn(context2, ...acc);
            return newArgs ? newArgs : acc;
          }, args);
        };
        objectProto._aInc = function afterPlugins(context2, method, result, ...args) {
          return this._inc[method].after.reduce((acc, fn) => {
            let newResult = fn(context2, acc, ...args);
            return newResult ? newResult : acc;
          }, result);
        };
      }
      Object.getOwnPropertyNames(pluginObj).map((methodName) => {
        let method = getMethod(methodName);
        if (!objectProto[method])
          return;
        if (!objectProto["_o" + method]) {
          objectProto["_o" + method] = objectProto[method];
          objectProto[method] = function interceptedFn(...args) {
            let alteredArgs = this._bInc(this, method, ...args);
            let result = objectProto["_o" + method].call(
              this,
              ...alteredArgs
            );
            return this._aInc(this, method, result, ...args);
          };
        }
        if (!objectProto._inc[method]) {
          objectProto._inc[method] = {
            before: [],
            after: []
          };
        }
        if (methodName.startsWith("before")) {
          objectProto._inc[method].before.push(pluginObj[methodName]);
        } else if (methodName.startsWith("after")) {
          objectProto._inc[method].after.push(pluginObj[methodName]);
        }
      });
    }
    function unregisterPlugin(kontraObj, pluginObj) {
      let objectProto = kontraObj.prototype;
      if (!objectProto || !objectProto._inc)
        return;
      Object.getOwnPropertyNames(pluginObj).map((methodName) => {
        let method = getMethod(methodName);
        if (methodName.startsWith("before")) {
          removeFromArray(
            objectProto._inc[method].before,
            pluginObj[methodName]
          );
        } else if (methodName.startsWith("after")) {
          removeFromArray(
            objectProto._inc[method].after,
            pluginObj[methodName]
          );
        }
      });
    }
    function extendObject(kontraObj, properties) {
      let objectProto = kontraObj.prototype;
      if (!objectProto)
        return;
      Object.getOwnPropertyNames(properties).map((prop) => {
        if (!objectProto[prop]) {
          objectProto[prop] = properties[prop];
        }
      });
    }
    class Pool {
      /**
       * @docs docs/api_docs/pool.js
       */
      constructor({ create, maxSize = 1024 } = {}) {
        let obj;
        if (!create || !(obj = create()) || !(obj.update && obj.init && obj.isAlive && obj.render)) {
          throw Error(
            "Must provide create() function which returns an object with init(), update(), render(), and isAlive() functions"
          );
        }
        this._c = create;
        this.objects = [create()];
        this.size = 0;
        this.maxSize = maxSize;
      }
      /**
       * Get and return an object from the pool. The properties parameter will be passed directly to the objects `init()` function. If you're using a [Sprite](api/sprite), you should also pass the `ttl` property to designate how many frames you want the object to be alive for.
       *
       * If you want to control when the sprite is ready for reuse, pass `Infinity` for `ttl`. You'll need to set the sprites `ttl` to `0` when you're ready for the sprite to be reused.
       *
       * ```js
       * // exclude-tablist
       * let sprite = pool.get({
       *   // the object will get these properties and values
       *   x: 100,
       *   y: 200,
       *   width: 20,
       *   height: 40,
       *   color: 'red',
       *
       *   // pass Infinity for ttl to prevent the object from being reused
       *   // until you set it back to 0
       *   ttl: Infinity
       * });
       * ```
       * @memberof Pool
       * @function get
       *
       * @param {Object} [properties] - Properties to pass to the objects `init()` function.
       *
       * @returns {Object} The newly initialized object.
       */
      get(properties = {}) {
        if (this.size == this.objects.length) {
          if (this.size == this.maxSize) {
            return;
          }
          for (let i = 0; i < this.size && this.objects.length < this.maxSize; i++) {
            this.objects.push(this._c());
          }
        }
        let obj = this.objects[this.size];
        this.size++;
        obj.init(properties);
        return obj;
      }
      /**
       * Returns an array of all alive objects. Useful if you need to do special processing on all alive objects outside of the pool, such as to add all alive objects to a [Quadtree](api/quadtree).
       * @memberof Pool
       * @function getAliveObjects
       *
       * @returns {Object[]} An Array of all alive objects.
       */
      getAliveObjects() {
        return this.objects.slice(0, this.size);
      }
      /**
       * Clear the object pool. Removes all objects from the pool and resets its [size](api/pool#size) to 1.
       * @memberof Pool
       * @function clear
       */
      clear() {
        this.size = this.objects.length = 0;
        this.objects.push(this._c());
      }
      /**
       * Update all alive objects in the pool by calling the objects `update()` function. This function also manages when each object should be recycled, so it is recommended that you do not call the objects `update()` function outside of this function.
       * @memberof Pool
       * @function update
       *
       * @param {Number} [dt] - Time since last update.
       */
      update(dt) {
        let obj;
        let doSort = false;
        for (let i = this.size; i--; ) {
          obj = this.objects[i];
          obj.update(dt);
          if (!obj.isAlive()) {
            doSort = true;
            this.size--;
          }
        }
        if (doSort) {
          this.objects.sort((a, b) => b.isAlive() - a.isAlive());
        }
      }
      /**
       * Render all alive objects in the pool by calling the objects `render()` function.
       * @memberof Pool
       * @function render
       */
      render() {
        for (let i = this.size; i--; ) {
          this.objects[i].render();
        }
      }
    }
    function factory$4() {
      return new Pool(...arguments);
    }
    function getIndices(object, bounds) {
      let indices = [];
      let verticalMidpoint = bounds.x + bounds.width / 2;
      let horizontalMidpoint = bounds.y + bounds.height / 2;
      let intersectsTopQuadrants = object.y < horizontalMidpoint;
      let intersectsBottomQuadrants = object.y + object.height >= horizontalMidpoint;
      if (object.x < verticalMidpoint) {
        if (intersectsTopQuadrants) {
          indices.push(0);
        }
        if (intersectsBottomQuadrants) {
          indices.push(2);
        }
      }
      if (object.x + object.width >= verticalMidpoint) {
        if (intersectsTopQuadrants) {
          indices.push(1);
        }
        if (intersectsBottomQuadrants) {
          indices.push(3);
        }
      }
      return indices;
    }
    class Quadtree {
      /**
       * @docs docs/api_docs/quadtree.js
       */
      constructor({ maxDepth = 3, maxObjects = 25, bounds } = {}) {
        this.maxDepth = maxDepth;
        this.maxObjects = maxObjects;
        let canvas = getCanvas();
        this.bounds = bounds || {
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height
        };
        this._b = false;
        this._d = 0;
        this._o = [];
        this._s = [];
        this._p = null;
      }
      /**
       * Removes all objects from the quadtree. You should clear the quadtree every frame before adding all objects back into it.
       * @memberof Quadtree
       * @function clear
       */
      clear() {
        this._s.map((subnode) => {
          subnode.clear();
        });
        this._b = false;
        this._o.length = 0;
      }
      /**
       * Get an array of all objects that belong to the same node as the passed in object.
       *
       * **Note:** if the passed in object is also part of the quadtree, it will not be returned in the results.
       *
       * ```js
       * import { Sprite, Quadtree } from 'kontra';
       *
       * let quadtree = Quadtree();
       * let player = Sprite({
       *   // ...
       * });
       * let enemy1 = Sprite({
       *   // ...
       * });
       * let enemy2 = Sprite({
       *   // ...
       * });
       *
       * quadtree.add(player, enemy1, enemy2);
       * quadtree.get(player);  //=> [enemy1]
       * ```
       * @memberof Quadtree
       * @function get
       *
       * @param {{x: Number, y: Number, width: Number, height: Number}} object - Object to use for finding other objects. The object must have the properties `x`, `y`, `width`, and `height` so that its position in the quadtree can be calculated.
       *
       * @returns {Object[]} A list of objects in the same node as the object, not including the object itself.
       */
      get(object) {
        let objects = /* @__PURE__ */ new Set();
        while (this._s.length && this._b) {
          getIndices(object, this.bounds).map((index) => {
            this._s[index].get(object).map((obj) => objects.add(obj));
          });
          return Array.from(objects);
        }
        return this._o.filter((obj) => obj !== object);
      }
      /**
       * Add objects to the quadtree and group them by their position. Can take a single object, a list of objects, and an array of objects.
       *
       * ```js
       * import { Quadtree, Sprite, Pool, GameLoop } from 'kontra';
       *
       * let quadtree = Quadtree();
       * let bulletPool = Pool({
       *   create: Sprite
       * });
       *
       * let player = Sprite({
       *   // ...
       * });
       * let enemy = Sprite({
       *   // ...
       * });
       *
       * // create some bullets
       * for (let i = 0; i < 100; i++) {
       *   bulletPool.get({
       *     // ...
       *   });
       * }
       *
       * let loop = GameLoop({
       *   update: function() {
       *     quadtree.clear();
       *     quadtree.add(player, enemy, bulletPool.getAliveObjects());
       *   }
       * });
       * ```
       * @memberof Quadtree
       * @function add
       *
       * @param {...({x: Number, y: Number, width: Number, height: Number}|{x: Number, y: Number, width: Number, height: Number}[])[]} objects - Objects to add to the quadtree. Can be a single object, an array of objects, or a comma-separated list of objects.
       */
      add(...objects) {
        objects.flat().map((object) => {
          if (this._b) {
            this._a(object);
            return;
          }
          this._o.push(object);
          if (this._o.length > this.maxObjects && this._d < this.maxDepth) {
            this._sp();
            this._o.map((obj) => this._a(obj));
            this._o.length = 0;
          }
        });
      }
      /**
       * Add an object to a subnode.
       *
       * @param {Object} object - Object to add into a subnode
       */
      _a(object) {
        getIndices(object, this.bounds).map((index) => {
          this._s[index].add(object);
        });
      }
      /**
       * Split the node into four subnodes.
       */
      // @see https://github.com/jed/140bytes/wiki/Byte-saving-techniques#use-placeholder-arguments-instead-of-var
      _sp(subWidth, subHeight, i) {
        this._b = true;
        if (this._s.length) {
          return;
        }
        subWidth = this.bounds.width / 2 | 0;
        subHeight = this.bounds.height / 2 | 0;
        for (i = 0; i < 4; i++) {
          this._s[i] = new Quadtree({
            bounds: {
              x: this.bounds.x + (i % 2 == 1 ? subWidth : 0),
              // nodes 1 and 3
              y: this.bounds.y + (i >= 2 ? subHeight : 0),
              // nodes 2 and 3
              width: subWidth,
              height: subHeight
            },
            maxDepth: this.maxDepth,
            maxObjects: this.maxObjects
          });
          this._s[i]._d = this._d + 1;
        }
      }
    }
    function factory$3() {
      return new Quadtree(...arguments);
    }
    function getAllNodes(object) {
      let nodes = [];
      if (object._dn) {
        nodes.push(object._dn);
      } else if (object.children) {
        object.children.map((child) => {
          nodes = nodes.concat(getAllNodes(child));
        });
      }
      return nodes;
    }
    class Scene {
      constructor({
        /**
         * The id of the scene.
         * @memberof Scene
         * @property {String} id
         */
        id,
        /**
         * The name of the scene. Used by screen readers to identify each scene. Use this property to give the scene a human friendly name.
         * @memberof Scene
         * @property {String} name
         */
        name = id,
        /**
         * The objects of the scene.
         * @memberof Scene
         * @property {Object[]} objects
         */
        objects = [],
        /**
         * The context the scene will draw to.
         * @memberof Scene
         * @property {CanvasRenderingContext2D} context
         */
        context: context2 = getContext(),
        /**
         * If the camera should cull objects outside the camera bounds. Not rendering objects which can't be seen greatly improves the performance.
         * @memberof Scene
         * @property {Boolean} cullObjects
         */
        cullObjects = true,
        /**
         * Camera culling function which prevents objects outside the camera screen from rendering.
         * @memberof Scene
         * @property {Function} cullFunction
         */
        cullFunction = collides,
        /**
         * Function used to sort the objects of the scene before rendering. Can be used in conjunction with [helpers.depthSort](/api/helpers#depthSort). Only direct objects of the scene are sorted.
         *
         * ```js
         * import { Scene, Sprite, depthSort } from 'kontra';
         *
         * let sprite1 = Sprite({
         *   // ...
         * });
         * let sprite2 = Sprite({
         *   // ...
         * });
         *
         * let scene = Scene({
         *   id: 'game',
         *   objects: [sprite1, sprite2],
         *   sortFunction: depthSort
         * });
         *
         * scene.render();
         * ```
         * @memberof Scene
         * @property {Function} sortFunction
         */
        sortFunction,
        ...props
      }) {
        this._o = [];
        Object.assign(this, {
          id,
          name,
          context: context2,
          cullObjects,
          cullFunction,
          sortFunction,
          ...props
        });
        let section = this._dn = document.createElement("section");
        section.tabIndex = -1;
        section.style = srOnlyStyle;
        section.id = id;
        section.setAttribute("aria-label", name);
        let _this = this;
        class Camera extends GameObject {
          set x(value) {
            _this.sx = value - this.centerX;
            super.x = value;
          }
          get x() {
            return super.x;
          }
          set y(value) {
            _this.sy = value - this.centerY;
            super.y = value;
          }
          get y() {
            return super.y;
          }
        }
        this.camera = new Camera({
          context: context2,
          anchor: { x: 0.5, y: 0.5 },
          render: this._rf.bind(this)
        });
        this.add(objects);
        this._i = () => {
          this.context ??= getContext();
          let canvas = this.context.canvas;
          let { width, height } = canvas;
          let x = width / 2;
          let y = height / 2;
          Object.assign(this.camera, {
            centerX: x,
            centerY: y,
            x,
            y,
            width,
            height
          });
          if (!this._dn.isConnected) {
            addToDom(this._dn, canvas);
          }
        };
        if (this.context) {
          this._i();
        }
        on("init", this._i);
      }
      set objects(value) {
        this.remove(this._o);
        this.add(value);
      }
      get objects() {
        return this._o;
      }
      /**
       * Add an object to the scene.
       * @memberof Scene
       * @function add
       *
       * @param {...(Object|Object[])[]} objects - Object to add. Can be a single object, an array of objects, or a comma-separated list of objects.
       */
      add(...objects) {
        objects.flat().map((object) => {
          this._o.push(object);
          object.parent = this;
          getAllNodes(object).map((node) => {
            this._dn.appendChild(node);
          });
        });
      }
      /**
       * Remove an object from the scene.
       * @memberof Scene
       * @function remove
       *
       * @param {...(Object|Object[])[]} objects - Object to remove. Can be a single object, an array of objects, or a comma-separated list of objects.
       */
      remove(...objects) {
        objects.flat().map((object) => {
          removeFromArray(this._o, object);
          object.parent = null;
          getAllNodes(object).map((node) => {
            addToDom(node, this.context);
          });
        });
      }
      /**
       * Show the scene and resume update and render. Calls [onShow](api/scene#onShow) if passed.
       * @memberof Scene
       * @function show
       */
      show() {
        this.hidden = this._dn.hidden = false;
        let focusableObject = this._o.find((object) => object.focus);
        if (focusableObject) {
          focusableObject.focus();
        } else {
          this._dn.focus();
        }
        this.onShow();
      }
      /**
       * Hide the scene. A hidden scene will not update or render. Calls [onHide](api/scene#onHide) if passed.
       * @memberof Scene
       * @function hide
       */
      hide() {
        this.hidden = this._dn.hidden = true;
        this.onHide();
      }
      /**
       * Clean up the scene and call `destroy()` on all objects.
       * @memberof Scene
       * @function destroy
       */
      destroy() {
        off("init", this._i);
        this._dn.remove();
        this._o.map((object) => object.destroy && object.destroy());
      }
      /**
       * Focus the camera to the objects x/y position. As the scene is scaled the focal point will keep to the position.
       * @memberof Scene
       * @function lookAt
       *
       * @param {{x: Number, y: Number}} object - Object to look at.
       */
      lookAt(object) {
        let { x, y } = object.world || object;
        this.camera.x = x;
        this.camera.y = y;
      }
      /**
       * Update all objects of the scene by calling the objects `update()` function.
       * @memberof Scene
       * @function update
       *
       * @param {Number} [dt] - Time since last update.
       */
      update(dt) {
        if (!this.hidden) {
          this._o.map((object) => object.update && object.update(dt));
        }
      }
      /**
       * Render all children inside the cameras render function, essentially treating the scenes objects as children of the camera. This allows the camera to control the position, scale, and rotation of the scene.
       */
      _rf() {
        let {
          _o,
          context: context2,
          _sx,
          _sy,
          camera,
          sortFunction,
          cullObjects,
          cullFunction
        } = this;
        context2.translate(_sx, _sy);
        let objects = _o;
        if (cullObjects) {
          objects = objects.filter(
            (object) => cullFunction(camera, object)
          );
        }
        if (sortFunction) {
          objects.sort(sortFunction);
        }
        objects.map((object) => object.render && object.render());
      }
      /**
       * Render all objects of the scene by calling the objects `render()` function. If [cullObjects](/api/scene#cullObjects) is set to true then only those objects which are inside the camera bounds will be rendered.
       * @memberof Scene
       * @function render
       */
      render() {
        if (!this.hidden) {
          let { context: context2, camera } = this;
          let { x, y, centerX, centerY } = camera;
          context2.save();
          this._sx = centerX - x;
          this._sy = centerY - y;
          context2.translate(this._sx, this._sy);
          camera.render();
          context2.restore();
        }
      }
      /**
       * Function called when the scene is shown. Override this function to have the scene do something when shown, such as adding input events.
       *
       * ```js
       * let { Scene, onKey } = 'kontra';
       *
       * let scene = Scene({
       *   onShow() {
       *     onKey('arrowup', () => {
       *       // ...
       *     })
       *   }
       * });
       * ```
       * @memberof Scene
       * @function onShow
       */
      onShow() {
      }
      /**
       * Function called when the scene is hidden. Override this function to have the scene do something when hidden, such as cleaning up input events.
       *
       * ```js
       * let { Scene, offKey } = 'kontra';
       *
       * let scene = Scene({
       *   onHide() {
       *     offKey('arrowup');
       *   }
       * });
       * ```
       * @memberof Scene
       * @function onHide
       */
      onHide() {
      }
    }
    function factory$2() {
      return new Scene(...arguments);
    }
    function parseFrames(consecutiveFrames) {
      if (+consecutiveFrames == consecutiveFrames) {
        return consecutiveFrames;
      }
      let sequence = [];
      let frames = consecutiveFrames.split("..");
      let start = +frames[0];
      let end = +frames[1];
      let i = start;
      if (start < end) {
        for (; i <= end; i++) {
          sequence.push(i);
        }
      } else {
        for (; i >= end; i--) {
          sequence.push(i);
        }
      }
      return sequence;
    }
    class SpriteSheet {
      constructor({
        image,
        frameWidth,
        frameHeight,
        frameMargin,
        animations
      } = {}) {
        if (!image) {
          throw Error("You must provide an Image for the SpriteSheet");
        }
        this.animations = {};
        this.image = image;
        this.frame = {
          width: frameWidth,
          height: frameHeight,
          margin: frameMargin
        };
        this._f = image.width / frameWidth | 0;
        this.createAnimations(animations);
      }
      /**
       * Create named animations from the sprite sheet. Called from the constructor if the `animations` argument is passed.
       *
       * This function populates the sprite sheets `animations` property with [Animation](api/animation) objects. Each animation is accessible by its name.
       *
       * ```js
       * import { Sprite, SpriteSheet } from 'kontra';
       *
       * let image = new Image();
       * image.src = 'assets/imgs/character_walk_sheet.png';
       * image.onload = function() {
       *
       *   let spriteSheet = SpriteSheet({
       *     image: image,
       *     frameWidth: 72,
       *     frameHeight: 97,
       *
       *     // this will also call createAnimations()
       *     animations: {
       *       // create 1 animation: idle
       *       idle: {
       *         // a single frame
       *         frames: 1
       *       }
       *     }
       *   });
       *
       *   spriteSheet.createAnimations({
       *     // create 4 animations: jump, walk, moonWalk, attack
       *     jump: {
       *       // sequence of frames (can be non-consecutive)
       *       frames: [1, 10, 1],
       *       frameRate: 10,
       *       loop: false,
       *     },
       *     walk: {
       *       // ascending consecutive frame animation (frames 2-6, inclusive)
       *       frames: '2..6',
       *       frameRate: 20
       *     },
       *     moonWalk: {
       *       // descending consecutive frame animation (frames 6-2, inclusive)
       *       frames: '6..2',
       *       frameRate: 20
       *     },
       *     attack: {
       *       // you can also mix and match, in this case frames [8,9,10,13,10,9,8]
       *       frames: ['8..10', 13, '10..8'],
       *       frameRate: 10,
       *       loop: false,
       *     }
       *   });
       * };
       * ```
       * @memberof SpriteSheet
       * @function createAnimations
       *
       * @param {Object} animations - Object of named animations to create from the sprite sheet.
       * @param {Number|String|Number[]|String[]} animations.<name>.frames - The sequence of frames to use from the sprite sheet. It can either be a single frame (`1`), a sequence of frames (`[1,2,3,4]`), or a consecutive frame notation (`'1..4'`). Sprite sheet frames are `0` indexed.
       * @param {Number} animations.<name>.frameRate - The number frames to display per second.
       * @param {Boolean} [animations.<name>.loop=true] - If the animation should loop back to the beginning once completed.
       */
      createAnimations(animations) {
        let sequence, name;
        for (name in animations) {
          let { frames, frameRate, loop } = animations[name];
          sequence = [];
          if (frames == void 0) {
            throw Error(
              "Animation " + name + " must provide a frames property"
            );
          }
          [].concat(frames).map((frame) => {
            sequence = sequence.concat(parseFrames(frame));
          });
          this.animations[name] = factory$b({
            spriteSheet: this,
            frames: sequence,
            frameRate,
            loop,
            name
          });
        }
      }
    }
    function factory$1() {
      return new SpriteSheet(...arguments);
    }
    function getRow(y, tileheight) {
      return y / tileheight | 0;
    }
    function getCol(x, tilewidth) {
      return x / tilewidth | 0;
    }
    class TileEngine {
      constructor(properties = {}) {
        let {
          /**
           * The width of tile map (in tiles).
           * @memberof TileEngine
           * @property {Number} width
           */
          width,
          /**
           * The height of tile map (in tiles).
           * @memberof TileEngine
           * @property {Number} height
           */
          height,
          /**
           * The width a tile (in pixels).
           * @memberof TileEngine
           * @property {Number} tilewidth
           */
          tilewidth,
          /**
           * The height of a tile (in pixels).
           * @memberof TileEngine
           * @property {Number} tileheight
           */
          tileheight,
          /**
           * Array of all tilesets of the tile engine.
           * @memberof TileEngine
           * @property {Object[]} tilesets
           */
          tilesets
          /**
           * The context the tile engine will draw to.
           * @memberof TileEngine
           * @property {CanvasRenderingContext2D} context
           */
        } = properties;
        let mapwidth = width * tilewidth;
        let mapheight = height * tileheight;
        let canvas = document.createElement("canvas");
        canvas.width = mapwidth;
        canvas.height = mapheight;
        this._c = canvas;
        this._ctx = canvas.getContext("2d");
        tilesets.map((tileset) => {
          let { __k, location } = window;
          let url = (__k ? __k.dm.get(properties) : "") || location.href;
          let { source } = tileset;
          if (source) {
            if (!__k) {
              throw Error(
                `You must use "load" or "loadData" to resolve tileset.source`
              );
            }
            let resolvedSorce = __k.d[__k.u(source, url)];
            if (!resolvedSorce) {
              throw Error(
                `You must load the tileset source "${source}" before loading the tileset`
              );
            }
            Object.keys(resolvedSorce).map((key) => {
              tileset[key] = resolvedSorce[key];
            });
          }
          let { image } = tileset;
          if ("" + image === image) {
            if (!__k) {
              throw Error(
                `You must use "load" or "loadImage" to resolve tileset.image`
              );
            }
            let resolvedImage = __k.i[__k.u(image, url)];
            if (!resolvedImage) {
              throw Error(
                `You must load the image "${image}" before loading the tileset`
              );
            }
            tileset.image = resolvedImage;
          }
        });
        Object.assign(this, {
          context: getContext(),
          layerMap: {},
          layerCanvases: {},
          /**
           * The width of the tile map (in pixels).
           * @memberof TileEngine
           * @property {Number} mapwidth
           */
          mapwidth,
          /**
           * The height of the tile map (in pixels).
           * @memberof TileEngine
           * @property {Number} mapheight
           */
          mapheight,
          // @ifdef TILEENGINE_CAMERA
          _sx: 0,
          _sy: 0,
          // o = objects
          _o: [],
          // @endif
          /**
           * Array of all layers of the tile engine.
           * @memberof TileEngine
           * @property {Object[]} layers
           */
          ...properties
        });
        if (this.context) {
          this._p();
        }
        on("init", () => {
          this.context ??= getContext();
          this._p();
        });
      }
      // @ifdef TILEENGINE_CAMERA
      /**
       * X coordinate of the tile map camera.
       * @memberof TileEngine
       * @property {Number} sx
       */
      get sx() {
        return this._sx;
      }
      /**
       * Y coordinate of the tile map camera.
       * @memberof TileEngine
       * @property {Number} sy
       */
      get sy() {
        return this._sy;
      }
      // when clipping an image, sx and sy must be within the image
      // region, otherwise. Firefox and Safari won't draw it.
      // @see http://stackoverflow.com/questions/19338032/canvas-indexsizeerror-index-or-size-is-negative-or-greater-than-the-allowed-a
      set sx(value) {
        let max = Math.max(0, this.mapwidth - getCanvas().width);
        this._sx = clamp(0, max, value);
      }
      set sy(value) {
        let max = Math.max(0, this.mapheight - getCanvas().height);
        this._sy = clamp(0, max, value);
      }
      set objects(value) {
        this.remove(this._o);
        this.add(value);
      }
      get objects() {
        return this._o;
      }
      /**
       * Add an object to the tile engine.
       * @memberof TileEngine
       * @function add
       *
       * @param {...(Object|Object[])[]} objects - Object to add to the tile engine. Can be a single object, an array of objects, or a comma-separated list of objects.
       */
      add(...objects) {
        objects.flat().map((object) => {
          this._o.push(object);
          object.parent = this;
        });
      }
      /**
       * Remove an object from the tile engine.
       * @memberof TileEngine
       * @function remove
       *
       * @param {...(Object|Object[])[]} objects - Object to remove from the tile engine. Can be a single object, an array of objects, or a comma-separated list of objects.
       */
      remove(...objects) {
        objects.flat().map((object) => {
          removeFromArray(this._o, object);
          object.parent = null;
        });
      }
      // @endif
      // @ifdef TILEENGINE_DYNAMIC
      /**
       * Set the tile at the specified layer using either x and y coordinates or row and column coordinates.
       *
       * ```js
       * import { TileEngine } from 'kontra';
       *
       * let tileEngine = TileEngine({
       *   tilewidth: 32,
       *   tileheight: 32,
       *   width: 4,
       *   height: 4,
       *   tilesets: [{
       *     // ...
       *   }],
       *   layers: [{
       *     name: 'collision',
       *     data: [ 0,0,0,0,
       *             0,1,4,0,
       *             0,2,5,0,
       *             0,0,0,0 ]
       *   }]
       * });
       *
       * tileEngine.setTileAtLayer('collision', {row: 2, col: 1}, 10);
       * tileEngine.tileAtLayer('collision', {row: 2, col: 1});  //=> 10
       * ```
       * @memberof TileEngine
       * @function setTileAtLayer
       *
       * @param {String} name - Name of the layer.
       * @param {{x: Number, y: Number}|{row: Number, col: Number}} position - Position of the tile in either {x, y} or {row, col} coordinates.
       * @param {Number} tile - Tile index to set.
       */
      setTileAtLayer(name, position, tile) {
        let { layerMap, tileheight, tilewidth, width } = this;
        let { row, col, x, y } = position;
        let tileRow = row ?? getRow(y, tileheight);
        let tileCol = col ?? getCol(x, tilewidth);
        if (layerMap[name]) {
          this._d = true;
          layerMap[name]._d = true;
          layerMap[name].data[tileRow * width + tileCol] = tile;
        }
      }
      /**
       * Set the data at the specified layer.
       *
       * ```js
       * import { TileEngine } from 'kontra';
       *
       * let tileEngine = TileEngine({
       *   tilewidth: 32,
       *   tileheight: 32,
       *   width: 2,
       *   height: 2,
       *   tilesets: [{
       *     // ...
       *   }],
       *   layers: [{
       *     name: 'collision',
       *     data: [ 0,1,
       *             2,3 ]
       *   }]
       * });
       *
       * tileEngine.setLayer('collision', [ 4,5,6,7]);
       * tileEngine.tileAtLayer('collision', {row: 0, col: 0});  //=> 4
       * tileEngine.tileAtLayer('collision', {row: 0, col: 1});  //=> 5
       * tileEngine.tileAtLayer('collision', {row: 1, col: 0});  //=> 6
       * tileEngine.tileAtLayer('collision', {row: 1, col: 1});  //=> 7
       * ```
       *
       * @memberof TileEngine
       * @function setLayer
       *
       * @param {String} name - Name of the layer.
       * @param {Number[]} data - 1D array of tile indices.
       */
      setLayer(name, data) {
        let { layerMap } = this;
        if (layerMap[name]) {
          this._d = true;
          layerMap[name]._d = true;
          layerMap[name].data = data;
        }
      }
      // @endif
      // @ifdef TILEENGINE_QUERY
      /**
       * Check if the object collides with the layer (shares a gird coordinate with any positive tile index in layers data). The object being checked must have the properties `x`, `y`, `width`, and `height` so that its position in the grid can be calculated. [Sprite](api/sprite) defines these properties for you.
       *
       * ```js
       * import { TileEngine, Sprite } from 'kontra';
       *
       * let tileEngine = TileEngine({
       *   tilewidth: 32,
       *   tileheight: 32,
       *   width: 4,
       *   height: 4,
       *   tilesets: [{
       *     // ...
       *   }],
       *   layers: [{
       *     name: 'collision',
       *     data: [ 0,0,0,0,
       *             0,1,4,0,
       *             0,2,5,0,
       *             0,0,0,0 ]
       *   }]
       * });
       *
       * let sprite = Sprite({
       *   x: 50,
       *   y: 20,
       *   width: 5,
       *   height: 5
       * });
       *
       * tileEngine.layerCollidesWith('collision', sprite);  //=> false
       *
       * sprite.y = 28;
       *
       * tileEngine.layerCollidesWith('collision', sprite);  //=> true
       * ```
       * @memberof TileEngine
       * @function layerCollidesWith
       *
       * @param {String} name - The name of the layer to check for collision.
       * @param {Object} object - Object to check collision against.
       *
       * @returns {Boolean} `true` if the object collides with a tile, `false` otherwise.
       */
      layerCollidesWith(name, object) {
        let { tilewidth, tileheight, layerMap } = this;
        let { x, y, width, height } = getWorldRect(object);
        let row = getRow(y, tileheight);
        let col = getCol(x, tilewidth);
        let endRow = getRow(y + height, tileheight);
        let endCol = getCol(x + width, tilewidth);
        let layer = layerMap[name];
        for (let r = row; r <= endRow; r++) {
          for (let c = col; c <= endCol; c++) {
            if (layer.data[c + r * this.width]) {
              return true;
            }
          }
        }
        return false;
      }
      /**
       * Get the tile at the specified layer using either x and y coordinates or row and column coordinates.
       *
       * ```js
       * import { TileEngine } from 'kontra';
       *
       * let tileEngine = TileEngine({
       *   tilewidth: 32,
       *   tileheight: 32,
       *   width: 4,
       *   height: 4,
       *   tilesets: [{
       *     // ...
       *   }],
       *   layers: [{
       *     name: 'collision',
       *     data: [ 0,0,0,0,
       *             0,1,4,0,
       *             0,2,5,0,
       *             0,0,0,0 ]
       *   }]
       * });
       *
       * tileEngine.tileAtLayer('collision', {x: 50, y: 50});  //=> 1
       * tileEngine.tileAtLayer('collision', {row: 2, col: 1});  //=> 2
       * ```
       * @memberof TileEngine
       * @function tileAtLayer
       *
       * @param {String} name - Name of the layer.
       * @param {{x: Number, y: Number}|{row: Number, col: Number}} position - Position of the tile in either {x, y} or {row, col} coordinates.
       *
       * @returns {Number} The tile index. Will return `-1` if no layer exists by the provided name.
       */
      tileAtLayer(name, position) {
        let { layerMap, tileheight, tilewidth, width } = this;
        let { row, col, x, y } = position;
        let tileRow = row ?? getRow(y, tileheight);
        let tileCol = col ?? getCol(x, tilewidth);
        if (layerMap[name]) {
          return layerMap[name].data[tileRow * width + tileCol];
        }
        return -1;
      }
      // @endif
      /**
       * Render all visible layers.
       * @memberof TileEngine
       * @function render
       */
      render(_canvas = this._c, _renderObjects = true) {
        let { _d, context: context2, sx = 0, sy = 0 } = this;
        if (_d) {
          this._p();
        }
        let { width, height } = getCanvas();
        let sWidth = Math.min(_canvas.width, width);
        let sHeight = Math.min(_canvas.height, height);
        context2.drawImage(
          _canvas,
          sx,
          sy,
          sWidth,
          sHeight,
          0,
          0,
          sWidth,
          sHeight
        );
        if (_renderObjects) {
          context2.save();
          if (sx || sy) {
            context2.translate(-sx, -sy);
          }
          this.objects.map((obj) => obj.render && obj.render());
          context2.restore();
        }
      }
      /**
       * Render a specific layer by name.
       * @memberof TileEngine
       * @function renderLayer
       *
       * @param {String} name - Name of the layer to render.
       */
      renderLayer(name) {
        let { layerCanvases, layerMap } = this;
        let layer = layerMap[name];
        let canvas = layerCanvases[name];
        let context2 = canvas?.getContext("2d");
        if (!canvas) {
          let { mapwidth, mapheight } = this;
          canvas = document.createElement("canvas");
          context2 = canvas.getContext("2d");
          canvas.width = mapwidth;
          canvas.height = mapheight;
          layerCanvases[name] = canvas;
          this._r(layer, context2);
        }
        if (layer._d) {
          layer._d = false;
          context2.clearRect(0, 0, canvas.width, canvas.height);
          this._r(layer, context2);
        }
        this.render(canvas, false);
      }
      /**
       * Pre-render the tiles to make drawing fast.
       */
      _p() {
        let { _ctx, layers = [], layerMap } = this;
        this._d = false;
        layers.map((layer) => {
          let { name, data, visible } = layer;
          layer._d = false;
          layerMap[name] = layer;
          if (data && visible != false) {
            this._r(layer, _ctx);
          }
        });
      }
      /**
       * Render a layer.
       *
       * @param {Object} layer - Layer data.
       * @param {Context} context - Context to draw layer to.
       */
      _r(layer, context2) {
        let { opacity, data = [] } = layer;
        let { tilesets, width, tilewidth, tileheight } = this;
        context2.save();
        context2.globalAlpha = opacity;
        data.map((tile, index) => {
          if (!tile)
            return;
          let tileset;
          for (let i = tilesets.length - 1; i >= 0; i--) {
            tileset = tilesets[i];
            if (tile / tileset.firstgid >= 1) {
              break;
            }
          }
          let { image, margin = 0, firstgid, columns } = tileset;
          let offset = tile - firstgid;
          let cols = columns ?? image.width / (tilewidth + margin) | 0;
          let x = index % width * tilewidth;
          let y = (index / width | 0) * tileheight;
          let sx = offset % cols * (tilewidth + margin);
          let sy = (offset / cols | 0) * (tileheight + margin);
          context2.drawImage(
            image,
            sx,
            sy,
            tilewidth,
            tileheight,
            x,
            y,
            tilewidth,
            tileheight
          );
        });
        context2.restore();
      }
    }
    function factory() {
      return new TileEngine(...arguments);
    }
    let kontra2 = {
      Animation: factory$b,
      AnimationClass: Animation,
      imageAssets,
      audioAssets,
      dataAssets,
      setImagePath,
      setAudioPath,
      setDataPath,
      loadImage,
      loadAudio,
      loadData,
      load,
      Button: factory$6,
      ButtonClass: Button,
      init: init$1,
      getCanvas,
      getContext,
      on,
      off,
      emit,
      GameLoop,
      GameObject: factory$9,
      GameObjectClass: GameObject,
      gamepadMap,
      updateGamepad,
      initGamepad,
      onGamepad,
      offGamepad,
      gamepadPressed,
      gamepadAxis,
      gestureMap,
      initGesture,
      onGesture,
      offGesture,
      Grid: factory$5,
      GridClass: Grid,
      degToRad,
      radToDeg,
      angleToTarget,
      rotatePoint,
      movePoint,
      randInt,
      seedRand,
      lerp,
      inverseLerp,
      clamp,
      setStoreItem,
      getStoreItem,
      collides,
      getWorldRect,
      depthSort,
      initInput,
      onInput,
      offInput,
      keyMap,
      initKeys,
      onKey,
      offKey,
      keyPressed,
      registerPlugin,
      unregisterPlugin,
      extendObject,
      initPointer,
      getPointer,
      track,
      untrack,
      pointerOver,
      onPointer,
      offPointer,
      pointerPressed,
      Pool: factory$4,
      PoolClass: Pool,
      Quadtree: factory$3,
      QuadtreeClass: Quadtree,
      Scene: factory$2,
      SceneClass: Scene,
      Sprite: factory$8,
      SpriteClass: Sprite,
      SpriteSheet: factory$1,
      SpriteSheetClass: SpriteSheet,
      Text: factory$7,
      TextClass: Text,
      TileEngine: factory,
      TileEngineClass: TileEngine,
      Vector: factory$a,
      VectorClass: Vector
    };
    return kontra2;
  }();
})();
/*! Bundled license information:

kontra/kontra.js:
  (**
   * @preserve
   * Kontra.js v9.0.0
   *)
*/
