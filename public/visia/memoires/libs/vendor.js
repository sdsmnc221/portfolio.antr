(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1])
      }, this)
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ')
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = options.status === undefined ? 200 : options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

/* @preserve
 * Leaflet 1.3.1, a JS library for interactive maps. http://leafletjs.com
 * (c) 2010-2017 Vladimir Agafonkin, (c) 2010-2011 CloudMade
 */
!function(t,i){"object"==typeof exports&&"undefined"!=typeof module?i(exports):"function"==typeof define&&define.amd?define(["exports"],i):i(t.L={})}(this,function(t){"use strict";function i(t){var i,e,n,o;for(e=1,n=arguments.length;e<n;e++){o=arguments[e];for(i in o)t[i]=o[i]}return t}function e(t,i){var e=Array.prototype.slice;if(t.bind)return t.bind.apply(t,e.call(arguments,1));var n=e.call(arguments,2);return function(){return t.apply(i,n.length?n.concat(e.call(arguments)):arguments)}}function n(t){return t._leaflet_id=t._leaflet_id||++ti,t._leaflet_id}function o(t,i,e){var n,o,s,r;return r=function(){n=!1,o&&(s.apply(e,o),o=!1)},s=function(){n?o=arguments:(t.apply(e,arguments),setTimeout(r,i),n=!0)}}function s(t,i,e){var n=i[1],o=i[0],s=n-o;return t===n&&e?t:((t-o)%s+s)%s+o}function r(){return!1}function a(t,i){var e=Math.pow(10,void 0===i?6:i);return Math.round(t*e)/e}function h(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")}function u(t){return h(t).split(/\s+/)}function l(t,i){t.hasOwnProperty("options")||(t.options=t.options?Qt(t.options):{});for(var e in i)t.options[e]=i[e];return t.options}function c(t,i,e){var n=[];for(var o in t)n.push(encodeURIComponent(e?o.toUpperCase():o)+"="+encodeURIComponent(t[o]));return(i&&-1!==i.indexOf("?")?"&":"?")+n.join("&")}function _(t,i){return t.replace(ii,function(t,e){var n=i[e];if(void 0===n)throw new Error("No value provided for variable "+t);return"function"==typeof n&&(n=n(i)),n})}function d(t,i){for(var e=0;e<t.length;e++)if(t[e]===i)return e;return-1}function p(t){return window["webkit"+t]||window["moz"+t]||window["ms"+t]}function m(t){var i=+new Date,e=Math.max(0,16-(i-oi));return oi=i+e,window.setTimeout(t,e)}function f(t,i,n){if(!n||si!==m)return si.call(window,e(t,i));t.call(i)}function g(t){t&&ri.call(window,t)}function v(){}function y(t){if("undefined"!=typeof L&&L&&L.Mixin){t=ei(t)?t:[t];for(var i=0;i<t.length;i++)t[i]===L.Mixin.Events&&console.warn("Deprecated include of L.Mixin.Events: this property will be removed in future releases, please inherit from L.Evented instead.",(new Error).stack)}}function x(t,i,e){this.x=e?Math.round(t):t,this.y=e?Math.round(i):i}function w(t,i,e){return t instanceof x?t:ei(t)?new x(t[0],t[1]):void 0===t||null===t?t:"object"==typeof t&&"x"in t&&"y"in t?new x(t.x,t.y):new x(t,i,e)}function P(t,i){if(t)for(var e=i?[t,i]:t,n=0,o=e.length;n<o;n++)this.extend(e[n])}function b(t,i){return!t||t instanceof P?t:new P(t,i)}function T(t,i){if(t)for(var e=i?[t,i]:t,n=0,o=e.length;n<o;n++)this.extend(e[n])}function z(t,i){return t instanceof T?t:new T(t,i)}function M(t,i,e){if(isNaN(t)||isNaN(i))throw new Error("Invalid LatLng object: ("+t+", "+i+")");this.lat=+t,this.lng=+i,void 0!==e&&(this.alt=+e)}function C(t,i,e){return t instanceof M?t:ei(t)&&"object"!=typeof t[0]?3===t.length?new M(t[0],t[1],t[2]):2===t.length?new M(t[0],t[1]):null:void 0===t||null===t?t:"object"==typeof t&&"lat"in t?new M(t.lat,"lng"in t?t.lng:t.lon,t.alt):void 0===i?null:new M(t,i,e)}function Z(t,i,e,n){if(ei(t))return this._a=t[0],this._b=t[1],this._c=t[2],void(this._d=t[3]);this._a=t,this._b=i,this._c=e,this._d=n}function S(t,i,e,n){return new Z(t,i,e,n)}function E(t){return document.createElementNS("http://www.w3.org/2000/svg",t)}function k(t,i){var e,n,o,s,r,a,h="";for(e=0,o=t.length;e<o;e++){for(n=0,s=(r=t[e]).length;n<s;n++)a=r[n],h+=(n?"L":"M")+a.x+" "+a.y;h+=i?Xi?"z":"x":""}return h||"M0 0"}function I(t){return navigator.userAgent.toLowerCase().indexOf(t)>=0}function A(t,i,e,n){return"touchstart"===i?O(t,e,n):"touchmove"===i?W(t,e,n):"touchend"===i&&H(t,e,n),this}function B(t,i,e){var n=t["_leaflet_"+i+e];return"touchstart"===i?t.removeEventListener(Qi,n,!1):"touchmove"===i?t.removeEventListener(te,n,!1):"touchend"===i&&(t.removeEventListener(ie,n,!1),t.removeEventListener(ee,n,!1)),this}function O(t,i,n){var o=e(function(t){if("mouse"!==t.pointerType&&t.MSPOINTER_TYPE_MOUSE&&t.pointerType!==t.MSPOINTER_TYPE_MOUSE){if(!(ne.indexOf(t.target.tagName)<0))return;$(t)}j(t,i)});t["_leaflet_touchstart"+n]=o,t.addEventListener(Qi,o,!1),se||(document.documentElement.addEventListener(Qi,R,!0),document.documentElement.addEventListener(te,D,!0),document.documentElement.addEventListener(ie,N,!0),document.documentElement.addEventListener(ee,N,!0),se=!0)}function R(t){oe[t.pointerId]=t,re++}function D(t){oe[t.pointerId]&&(oe[t.pointerId]=t)}function N(t){delete oe[t.pointerId],re--}function j(t,i){t.touches=[];for(var e in oe)t.touches.push(oe[e]);t.changedTouches=[t],i(t)}function W(t,i,e){var n=function(t){(t.pointerType!==t.MSPOINTER_TYPE_MOUSE&&"mouse"!==t.pointerType||0!==t.buttons)&&j(t,i)};t["_leaflet_touchmove"+e]=n,t.addEventListener(te,n,!1)}function H(t,i,e){var n=function(t){j(t,i)};t["_leaflet_touchend"+e]=n,t.addEventListener(ie,n,!1),t.addEventListener(ee,n,!1)}function F(t,i,e){function n(t){var i;if(Ui){if(!Pi||"mouse"===t.pointerType)return;i=re}else i=t.touches.length;if(!(i>1)){var e=Date.now(),n=e-(s||e);r=t.touches?t.touches[0]:t,a=n>0&&n<=h,s=e}}function o(t){if(a&&!r.cancelBubble){if(Ui){if(!Pi||"mouse"===t.pointerType)return;var e,n,o={};for(n in r)e=r[n],o[n]=e&&e.bind?e.bind(r):e;r=o}r.type="dblclick",i(r),s=null}}var s,r,a=!1,h=250;return t[ue+ae+e]=n,t[ue+he+e]=o,t[ue+"dblclick"+e]=i,t.addEventListener(ae,n,!1),t.addEventListener(he,o,!1),t.addEventListener("dblclick",i,!1),this}function U(t,i){var e=t[ue+ae+i],n=t[ue+he+i],o=t[ue+"dblclick"+i];return t.removeEventListener(ae,e,!1),t.removeEventListener(he,n,!1),Pi||t.removeEventListener("dblclick",o,!1),this}function V(t,i,e,n){if("object"==typeof i)for(var o in i)G(t,o,i[o],e);else for(var s=0,r=(i=u(i)).length;s<r;s++)G(t,i[s],e,n);return this}function q(t,i,e,n){if("object"==typeof i)for(var o in i)K(t,o,i[o],e);else if(i)for(var s=0,r=(i=u(i)).length;s<r;s++)K(t,i[s],e,n);else{for(var a in t[le])K(t,a,t[le][a]);delete t[le]}return this}function G(t,i,e,o){var s=i+n(e)+(o?"_"+n(o):"");if(t[le]&&t[le][s])return this;var r=function(i){return e.call(o||t,i||window.event)},a=r;Ui&&0===i.indexOf("touch")?A(t,i,r,s):!Vi||"dblclick"!==i||!F||Ui&&Si?"addEventListener"in t?"mousewheel"===i?t.addEventListener("onwheel"in t?"wheel":"mousewheel",r,!1):"mouseenter"===i||"mouseleave"===i?(r=function(i){i=i||window.event,ot(t,i)&&a(i)},t.addEventListener("mouseenter"===i?"mouseover":"mouseout",r,!1)):("click"===i&&Ti&&(r=function(t){st(t,a)}),t.addEventListener(i,r,!1)):"attachEvent"in t&&t.attachEvent("on"+i,r):F(t,r,s),t[le]=t[le]||{},t[le][s]=r}function K(t,i,e,o){var s=i+n(e)+(o?"_"+n(o):""),r=t[le]&&t[le][s];if(!r)return this;Ui&&0===i.indexOf("touch")?B(t,i,s):!Vi||"dblclick"!==i||!U||Ui&&Si?"removeEventListener"in t?"mousewheel"===i?t.removeEventListener("onwheel"in t?"wheel":"mousewheel",r,!1):t.removeEventListener("mouseenter"===i?"mouseover":"mouseleave"===i?"mouseout":i,r,!1):"detachEvent"in t&&t.detachEvent("on"+i,r):U(t,s),t[le][s]=null}function Y(t){return t.stopPropagation?t.stopPropagation():t.originalEvent?t.originalEvent._stopped=!0:t.cancelBubble=!0,nt(t),this}function X(t){return G(t,"mousewheel",Y),this}function J(t){return V(t,"mousedown touchstart dblclick",Y),G(t,"click",et),this}function $(t){return t.preventDefault?t.preventDefault():t.returnValue=!1,this}function Q(t){return $(t),Y(t),this}function tt(t,i){if(!i)return new x(t.clientX,t.clientY);var e=i.getBoundingClientRect(),n=e.width/i.offsetWidth||1,o=e.height/i.offsetHeight||1;return new x(t.clientX/n-e.left-i.clientLeft,t.clientY/o-e.top-i.clientTop)}function it(t){return Pi?t.wheelDeltaY/2:t.deltaY&&0===t.deltaMode?-t.deltaY/ce:t.deltaY&&1===t.deltaMode?20*-t.deltaY:t.deltaY&&2===t.deltaMode?60*-t.deltaY:t.deltaX||t.deltaZ?0:t.wheelDelta?(t.wheelDeltaY||t.wheelDelta)/2:t.detail&&Math.abs(t.detail)<32765?20*-t.detail:t.detail?t.detail/-32765*60:0}function et(t){_e[t.type]=!0}function nt(t){var i=_e[t.type];return _e[t.type]=!1,i}function ot(t,i){var e=i.relatedTarget;if(!e)return!0;try{for(;e&&e!==t;)e=e.parentNode}catch(t){return!1}return e!==t}function st(t,i){var e=t.timeStamp||t.originalEvent&&t.originalEvent.timeStamp,n=pi&&e-pi;n&&n>100&&n<500||t.target._simulatedClick&&!t._simulated?Q(t):(pi=e,i(t))}function rt(t){return"string"==typeof t?document.getElementById(t):t}function at(t,i){var e=t.style[i]||t.currentStyle&&t.currentStyle[i];if((!e||"auto"===e)&&document.defaultView){var n=document.defaultView.getComputedStyle(t,null);e=n?n[i]:null}return"auto"===e?null:e}function ht(t,i,e){var n=document.createElement(t);return n.className=i||"",e&&e.appendChild(n),n}function ut(t){var i=t.parentNode;i&&i.removeChild(t)}function lt(t){for(;t.firstChild;)t.removeChild(t.firstChild)}function ct(t){var i=t.parentNode;i.lastChild!==t&&i.appendChild(t)}function _t(t){var i=t.parentNode;i.firstChild!==t&&i.insertBefore(t,i.firstChild)}function dt(t,i){if(void 0!==t.classList)return t.classList.contains(i);var e=gt(t);return e.length>0&&new RegExp("(^|\\s)"+i+"(\\s|$)").test(e)}function pt(t,i){if(void 0!==t.classList)for(var e=u(i),n=0,o=e.length;n<o;n++)t.classList.add(e[n]);else if(!dt(t,i)){var s=gt(t);ft(t,(s?s+" ":"")+i)}}function mt(t,i){void 0!==t.classList?t.classList.remove(i):ft(t,h((" "+gt(t)+" ").replace(" "+i+" "," ")))}function ft(t,i){void 0===t.className.baseVal?t.className=i:t.className.baseVal=i}function gt(t){return void 0===t.className.baseVal?t.className:t.className.baseVal}function vt(t,i){"opacity"in t.style?t.style.opacity=i:"filter"in t.style&&yt(t,i)}function yt(t,i){var e=!1,n="DXImageTransform.Microsoft.Alpha";try{e=t.filters.item(n)}catch(t){if(1===i)return}i=Math.round(100*i),e?(e.Enabled=100!==i,e.Opacity=i):t.style.filter+=" progid:"+n+"(opacity="+i+")"}function xt(t){for(var i=document.documentElement.style,e=0;e<t.length;e++)if(t[e]in i)return t[e];return!1}function wt(t,i,e){var n=i||new x(0,0);t.style[pe]=(Oi?"translate("+n.x+"px,"+n.y+"px)":"translate3d("+n.x+"px,"+n.y+"px,0)")+(e?" scale("+e+")":"")}function Lt(t,i){t._leaflet_pos=i,Ni?wt(t,i):(t.style.left=i.x+"px",t.style.top=i.y+"px")}function Pt(t){return t._leaflet_pos||new x(0,0)}function bt(){V(window,"dragstart",$)}function Tt(){q(window,"dragstart",$)}function zt(t){for(;-1===t.tabIndex;)t=t.parentNode;t.style&&(Mt(),ve=t,ye=t.style.outline,t.style.outline="none",V(window,"keydown",Mt))}function Mt(){ve&&(ve.style.outline=ye,ve=void 0,ye=void 0,q(window,"keydown",Mt))}function Ct(t,i){if(!i||!t.length)return t.slice();var e=i*i;return t=kt(t,e),t=St(t,e)}function Zt(t,i,e){return Math.sqrt(Rt(t,i,e,!0))}function St(t,i){var e=t.length,n=new(typeof Uint8Array!=void 0+""?Uint8Array:Array)(e);n[0]=n[e-1]=1,Et(t,n,i,0,e-1);var o,s=[];for(o=0;o<e;o++)n[o]&&s.push(t[o]);return s}function Et(t,i,e,n,o){var s,r,a,h=0;for(r=n+1;r<=o-1;r++)(a=Rt(t[r],t[n],t[o],!0))>h&&(s=r,h=a);h>e&&(i[s]=1,Et(t,i,e,n,s),Et(t,i,e,s,o))}function kt(t,i){for(var e=[t[0]],n=1,o=0,s=t.length;n<s;n++)Ot(t[n],t[o])>i&&(e.push(t[n]),o=n);return o<s-1&&e.push(t[s-1]),e}function It(t,i,e,n,o){var s,r,a,h=n?Se:Bt(t,e),u=Bt(i,e);for(Se=u;;){if(!(h|u))return[t,i];if(h&u)return!1;a=Bt(r=At(t,i,s=h||u,e,o),e),s===h?(t=r,h=a):(i=r,u=a)}}function At(t,i,e,n,o){var s,r,a=i.x-t.x,h=i.y-t.y,u=n.min,l=n.max;return 8&e?(s=t.x+a*(l.y-t.y)/h,r=l.y):4&e?(s=t.x+a*(u.y-t.y)/h,r=u.y):2&e?(s=l.x,r=t.y+h*(l.x-t.x)/a):1&e&&(s=u.x,r=t.y+h*(u.x-t.x)/a),new x(s,r,o)}function Bt(t,i){var e=0;return t.x<i.min.x?e|=1:t.x>i.max.x&&(e|=2),t.y<i.min.y?e|=4:t.y>i.max.y&&(e|=8),e}function Ot(t,i){var e=i.x-t.x,n=i.y-t.y;return e*e+n*n}function Rt(t,i,e,n){var o,s=i.x,r=i.y,a=e.x-s,h=e.y-r,u=a*a+h*h;return u>0&&((o=((t.x-s)*a+(t.y-r)*h)/u)>1?(s=e.x,r=e.y):o>0&&(s+=a*o,r+=h*o)),a=t.x-s,h=t.y-r,n?a*a+h*h:new x(s,r)}function Dt(t){return!ei(t[0])||"object"!=typeof t[0][0]&&void 0!==t[0][0]}function Nt(t){return console.warn("Deprecated use of _flat, please use L.LineUtil.isFlat instead."),Dt(t)}function jt(t,i,e){var n,o,s,r,a,h,u,l,c,_=[1,4,2,8];for(o=0,u=t.length;o<u;o++)t[o]._code=Bt(t[o],i);for(r=0;r<4;r++){for(l=_[r],n=[],o=0,s=(u=t.length)-1;o<u;s=o++)a=t[o],h=t[s],a._code&l?h._code&l||((c=At(h,a,l,i,e))._code=Bt(c,i),n.push(c)):(h._code&l&&((c=At(h,a,l,i,e))._code=Bt(c,i),n.push(c)),n.push(a));t=n}return t}function Wt(t,i){var e,n,o,s,r="Feature"===t.type?t.geometry:t,a=r?r.coordinates:null,h=[],u=i&&i.pointToLayer,l=i&&i.coordsToLatLng||Ht;if(!a&&!r)return null;switch(r.type){case"Point":return e=l(a),u?u(t,e):new Xe(e);case"MultiPoint":for(o=0,s=a.length;o<s;o++)e=l(a[o]),h.push(u?u(t,e):new Xe(e));return new qe(h);case"LineString":case"MultiLineString":return n=Ft(a,"LineString"===r.type?0:1,l),new tn(n,i);case"Polygon":case"MultiPolygon":return n=Ft(a,"Polygon"===r.type?1:2,l),new en(n,i);case"GeometryCollection":for(o=0,s=r.geometries.length;o<s;o++){var c=Wt({geometry:r.geometries[o],type:"Feature",properties:t.properties},i);c&&h.push(c)}return new qe(h);default:throw new Error("Invalid GeoJSON object.")}}function Ht(t){return new M(t[1],t[0],t[2])}function Ft(t,i,e){for(var n,o=[],s=0,r=t.length;s<r;s++)n=i?Ft(t[s],i-1,e):(e||Ht)(t[s]),o.push(n);return o}function Ut(t,i){return i="number"==typeof i?i:6,void 0!==t.alt?[a(t.lng,i),a(t.lat,i),a(t.alt,i)]:[a(t.lng,i),a(t.lat,i)]}function Vt(t,i,e,n){for(var o=[],s=0,r=t.length;s<r;s++)o.push(i?Vt(t[s],i-1,e,n):Ut(t[s],n));return!i&&e&&o.push(o[0]),o}function qt(t,e){return t.feature?i({},t.feature,{geometry:e}):Gt(e)}function Gt(t){return"Feature"===t.type||"FeatureCollection"===t.type?t:{type:"Feature",properties:{},geometry:t}}function Kt(t,i){return new nn(t,i)}function Yt(t,i){return new dn(t,i)}function Xt(t){return Yi?new fn(t):null}function Jt(t){return Xi||Ji?new xn(t):null}var $t=Object.freeze;Object.freeze=function(t){return t};var Qt=Object.create||function(){function t(){}return function(i){return t.prototype=i,new t}}(),ti=0,ii=/\{ *([\w_-]+) *\}/g,ei=Array.isArray||function(t){return"[object Array]"===Object.prototype.toString.call(t)},ni="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",oi=0,si=window.requestAnimationFrame||p("RequestAnimationFrame")||m,ri=window.cancelAnimationFrame||p("CancelAnimationFrame")||p("CancelRequestAnimationFrame")||function(t){window.clearTimeout(t)},ai=(Object.freeze||Object)({freeze:$t,extend:i,create:Qt,bind:e,lastId:ti,stamp:n,throttle:o,wrapNum:s,falseFn:r,formatNum:a,trim:h,splitWords:u,setOptions:l,getParamString:c,template:_,isArray:ei,indexOf:d,emptyImageUrl:ni,requestFn:si,cancelFn:ri,requestAnimFrame:f,cancelAnimFrame:g});v.extend=function(t){var e=function(){this.initialize&&this.initialize.apply(this,arguments),this.callInitHooks()},n=e.__super__=this.prototype,o=Qt(n);o.constructor=e,e.prototype=o;for(var s in this)this.hasOwnProperty(s)&&"prototype"!==s&&"__super__"!==s&&(e[s]=this[s]);return t.statics&&(i(e,t.statics),delete t.statics),t.includes&&(y(t.includes),i.apply(null,[o].concat(t.includes)),delete t.includes),o.options&&(t.options=i(Qt(o.options),t.options)),i(o,t),o._initHooks=[],o.callInitHooks=function(){if(!this._initHooksCalled){n.callInitHooks&&n.callInitHooks.call(this),this._initHooksCalled=!0;for(var t=0,i=o._initHooks.length;t<i;t++)o._initHooks[t].call(this)}},e},v.include=function(t){return i(this.prototype,t),this},v.mergeOptions=function(t){return i(this.prototype.options,t),this},v.addInitHook=function(t){var i=Array.prototype.slice.call(arguments,1),e="function"==typeof t?t:function(){this[t].apply(this,i)};return this.prototype._initHooks=this.prototype._initHooks||[],this.prototype._initHooks.push(e),this};var hi={on:function(t,i,e){if("object"==typeof t)for(var n in t)this._on(n,t[n],i);else for(var o=0,s=(t=u(t)).length;o<s;o++)this._on(t[o],i,e);return this},off:function(t,i,e){if(t)if("object"==typeof t)for(var n in t)this._off(n,t[n],i);else for(var o=0,s=(t=u(t)).length;o<s;o++)this._off(t[o],i,e);else delete this._events;return this},_on:function(t,i,e){this._events=this._events||{};var n=this._events[t];n||(n=[],this._events[t]=n),e===this&&(e=void 0);for(var o={fn:i,ctx:e},s=n,r=0,a=s.length;r<a;r++)if(s[r].fn===i&&s[r].ctx===e)return;s.push(o)},_off:function(t,i,e){var n,o,s;if(this._events&&(n=this._events[t]))if(i){if(e===this&&(e=void 0),n)for(o=0,s=n.length;o<s;o++){var a=n[o];if(a.ctx===e&&a.fn===i)return a.fn=r,this._firingCount&&(this._events[t]=n=n.slice()),void n.splice(o,1)}}else{for(o=0,s=n.length;o<s;o++)n[o].fn=r;delete this._events[t]}},fire:function(t,e,n){if(!this.listens(t,n))return this;var o=i({},e,{type:t,target:this,sourceTarget:e&&e.sourceTarget||this});if(this._events){var s=this._events[t];if(s){this._firingCount=this._firingCount+1||1;for(var r=0,a=s.length;r<a;r++){var h=s[r];h.fn.call(h.ctx||this,o)}this._firingCount--}}return n&&this._propagateEvent(o),this},listens:function(t,i){var e=this._events&&this._events[t];if(e&&e.length)return!0;if(i)for(var n in this._eventParents)if(this._eventParents[n].listens(t,i))return!0;return!1},once:function(t,i,n){if("object"==typeof t){for(var o in t)this.once(o,t[o],i);return this}var s=e(function(){this.off(t,i,n).off(t,s,n)},this);return this.on(t,i,n).on(t,s,n)},addEventParent:function(t){return this._eventParents=this._eventParents||{},this._eventParents[n(t)]=t,this},removeEventParent:function(t){return this._eventParents&&delete this._eventParents[n(t)],this},_propagateEvent:function(t){for(var e in this._eventParents)this._eventParents[e].fire(t.type,i({layer:t.target,propagatedFrom:t.target},t),!0)}};hi.addEventListener=hi.on,hi.removeEventListener=hi.clearAllEventListeners=hi.off,hi.addOneTimeEventListener=hi.once,hi.fireEvent=hi.fire,hi.hasEventListeners=hi.listens;var ui=v.extend(hi),li=Math.trunc||function(t){return t>0?Math.floor(t):Math.ceil(t)};x.prototype={clone:function(){return new x(this.x,this.y)},add:function(t){return this.clone()._add(w(t))},_add:function(t){return this.x+=t.x,this.y+=t.y,this},subtract:function(t){return this.clone()._subtract(w(t))},_subtract:function(t){return this.x-=t.x,this.y-=t.y,this},divideBy:function(t){return this.clone()._divideBy(t)},_divideBy:function(t){return this.x/=t,this.y/=t,this},multiplyBy:function(t){return this.clone()._multiplyBy(t)},_multiplyBy:function(t){return this.x*=t,this.y*=t,this},scaleBy:function(t){return new x(this.x*t.x,this.y*t.y)},unscaleBy:function(t){return new x(this.x/t.x,this.y/t.y)},round:function(){return this.clone()._round()},_round:function(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this},floor:function(){return this.clone()._floor()},_floor:function(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this},ceil:function(){return this.clone()._ceil()},_ceil:function(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this},trunc:function(){return this.clone()._trunc()},_trunc:function(){return this.x=li(this.x),this.y=li(this.y),this},distanceTo:function(t){var i=(t=w(t)).x-this.x,e=t.y-this.y;return Math.sqrt(i*i+e*e)},equals:function(t){return(t=w(t)).x===this.x&&t.y===this.y},contains:function(t){return t=w(t),Math.abs(t.x)<=Math.abs(this.x)&&Math.abs(t.y)<=Math.abs(this.y)},toString:function(){return"Point("+a(this.x)+", "+a(this.y)+")"}},P.prototype={extend:function(t){return t=w(t),this.min||this.max?(this.min.x=Math.min(t.x,this.min.x),this.max.x=Math.max(t.x,this.max.x),this.min.y=Math.min(t.y,this.min.y),this.max.y=Math.max(t.y,this.max.y)):(this.min=t.clone(),this.max=t.clone()),this},getCenter:function(t){return new x((this.min.x+this.max.x)/2,(this.min.y+this.max.y)/2,t)},getBottomLeft:function(){return new x(this.min.x,this.max.y)},getTopRight:function(){return new x(this.max.x,this.min.y)},getTopLeft:function(){return this.min},getBottomRight:function(){return this.max},getSize:function(){return this.max.subtract(this.min)},contains:function(t){var i,e;return(t="number"==typeof t[0]||t instanceof x?w(t):b(t))instanceof P?(i=t.min,e=t.max):i=e=t,i.x>=this.min.x&&e.x<=this.max.x&&i.y>=this.min.y&&e.y<=this.max.y},intersects:function(t){t=b(t);var i=this.min,e=this.max,n=t.min,o=t.max,s=o.x>=i.x&&n.x<=e.x,r=o.y>=i.y&&n.y<=e.y;return s&&r},overlaps:function(t){t=b(t);var i=this.min,e=this.max,n=t.min,o=t.max,s=o.x>i.x&&n.x<e.x,r=o.y>i.y&&n.y<e.y;return s&&r},isValid:function(){return!(!this.min||!this.max)}},T.prototype={extend:function(t){var i,e,n=this._southWest,o=this._northEast;if(t instanceof M)i=t,e=t;else{if(!(t instanceof T))return t?this.extend(C(t)||z(t)):this;if(i=t._southWest,e=t._northEast,!i||!e)return this}return n||o?(n.lat=Math.min(i.lat,n.lat),n.lng=Math.min(i.lng,n.lng),o.lat=Math.max(e.lat,o.lat),o.lng=Math.max(e.lng,o.lng)):(this._southWest=new M(i.lat,i.lng),this._northEast=new M(e.lat,e.lng)),this},pad:function(t){var i=this._southWest,e=this._northEast,n=Math.abs(i.lat-e.lat)*t,o=Math.abs(i.lng-e.lng)*t;return new T(new M(i.lat-n,i.lng-o),new M(e.lat+n,e.lng+o))},getCenter:function(){return new M((this._southWest.lat+this._northEast.lat)/2,(this._southWest.lng+this._northEast.lng)/2)},getSouthWest:function(){return this._southWest},getNorthEast:function(){return this._northEast},getNorthWest:function(){return new M(this.getNorth(),this.getWest())},getSouthEast:function(){return new M(this.getSouth(),this.getEast())},getWest:function(){return this._southWest.lng},getSouth:function(){return this._southWest.lat},getEast:function(){return this._northEast.lng},getNorth:function(){return this._northEast.lat},contains:function(t){t="number"==typeof t[0]||t instanceof M||"lat"in t?C(t):z(t);var i,e,n=this._southWest,o=this._northEast;return t instanceof T?(i=t.getSouthWest(),e=t.getNorthEast()):i=e=t,i.lat>=n.lat&&e.lat<=o.lat&&i.lng>=n.lng&&e.lng<=o.lng},intersects:function(t){t=z(t);var i=this._southWest,e=this._northEast,n=t.getSouthWest(),o=t.getNorthEast(),s=o.lat>=i.lat&&n.lat<=e.lat,r=o.lng>=i.lng&&n.lng<=e.lng;return s&&r},overlaps:function(t){t=z(t);var i=this._southWest,e=this._northEast,n=t.getSouthWest(),o=t.getNorthEast(),s=o.lat>i.lat&&n.lat<e.lat,r=o.lng>i.lng&&n.lng<e.lng;return s&&r},toBBoxString:function(){return[this.getWest(),this.getSouth(),this.getEast(),this.getNorth()].join(",")},equals:function(t,i){return!!t&&(t=z(t),this._southWest.equals(t.getSouthWest(),i)&&this._northEast.equals(t.getNorthEast(),i))},isValid:function(){return!(!this._southWest||!this._northEast)}},M.prototype={equals:function(t,i){return!!t&&(t=C(t),Math.max(Math.abs(this.lat-t.lat),Math.abs(this.lng-t.lng))<=(void 0===i?1e-9:i))},toString:function(t){return"LatLng("+a(this.lat,t)+", "+a(this.lng,t)+")"},distanceTo:function(t){return _i.distance(this,C(t))},wrap:function(){return _i.wrapLatLng(this)},toBounds:function(t){var i=180*t/40075017,e=i/Math.cos(Math.PI/180*this.lat);return z([this.lat-i,this.lng-e],[this.lat+i,this.lng+e])},clone:function(){return new M(this.lat,this.lng,this.alt)}};var ci={latLngToPoint:function(t,i){var e=this.projection.project(t),n=this.scale(i);return this.transformation._transform(e,n)},pointToLatLng:function(t,i){var e=this.scale(i),n=this.transformation.untransform(t,e);return this.projection.unproject(n)},project:function(t){return this.projection.project(t)},unproject:function(t){return this.projection.unproject(t)},scale:function(t){return 256*Math.pow(2,t)},zoom:function(t){return Math.log(t/256)/Math.LN2},getProjectedBounds:function(t){if(this.infinite)return null;var i=this.projection.bounds,e=this.scale(t);return new P(this.transformation.transform(i.min,e),this.transformation.transform(i.max,e))},infinite:!1,wrapLatLng:function(t){var i=this.wrapLng?s(t.lng,this.wrapLng,!0):t.lng;return new M(this.wrapLat?s(t.lat,this.wrapLat,!0):t.lat,i,t.alt)},wrapLatLngBounds:function(t){var i=t.getCenter(),e=this.wrapLatLng(i),n=i.lat-e.lat,o=i.lng-e.lng;if(0===n&&0===o)return t;var s=t.getSouthWest(),r=t.getNorthEast();return new T(new M(s.lat-n,s.lng-o),new M(r.lat-n,r.lng-o))}},_i=i({},ci,{wrapLng:[-180,180],R:6371e3,distance:function(t,i){var e=Math.PI/180,n=t.lat*e,o=i.lat*e,s=Math.sin((i.lat-t.lat)*e/2),r=Math.sin((i.lng-t.lng)*e/2),a=s*s+Math.cos(n)*Math.cos(o)*r*r,h=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));return this.R*h}}),di={R:6378137,MAX_LATITUDE:85.0511287798,project:function(t){var i=Math.PI/180,e=this.MAX_LATITUDE,n=Math.max(Math.min(e,t.lat),-e),o=Math.sin(n*i);return new x(this.R*t.lng*i,this.R*Math.log((1+o)/(1-o))/2)},unproject:function(t){var i=180/Math.PI;return new M((2*Math.atan(Math.exp(t.y/this.R))-Math.PI/2)*i,t.x*i/this.R)},bounds:function(){var t=6378137*Math.PI;return new P([-t,-t],[t,t])}()};Z.prototype={transform:function(t,i){return this._transform(t.clone(),i)},_transform:function(t,i){return i=i||1,t.x=i*(this._a*t.x+this._b),t.y=i*(this._c*t.y+this._d),t},untransform:function(t,i){return i=i||1,new x((t.x/i-this._b)/this._a,(t.y/i-this._d)/this._c)}};var pi,mi,fi,gi,vi=i({},_i,{code:"EPSG:3857",projection:di,transformation:function(){var t=.5/(Math.PI*di.R);return S(t,.5,-t,.5)}()}),yi=i({},vi,{code:"EPSG:900913"}),xi=document.documentElement.style,wi="ActiveXObject"in window,Li=wi&&!document.addEventListener,Pi="msLaunchUri"in navigator&&!("documentMode"in document),bi=I("webkit"),Ti=I("android"),zi=I("android 2")||I("android 3"),Mi=parseInt(/WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1],10),Ci=Ti&&I("Google")&&Mi<537&&!("AudioNode"in window),Zi=!!window.opera,Si=I("chrome"),Ei=I("gecko")&&!bi&&!Zi&&!wi,ki=!Si&&I("safari"),Ii=I("phantom"),Ai="OTransition"in xi,Bi=0===navigator.platform.indexOf("Win"),Oi=wi&&"transition"in xi,Ri="WebKitCSSMatrix"in window&&"m11"in new window.WebKitCSSMatrix&&!zi,Di="MozPerspective"in xi,Ni=!window.L_DISABLE_3D&&(Oi||Ri||Di)&&!Ai&&!Ii,ji="undefined"!=typeof orientation||I("mobile"),Wi=ji&&bi,Hi=ji&&Ri,Fi=!window.PointerEvent&&window.MSPointerEvent,Ui=!(!window.PointerEvent&&!Fi),Vi=!window.L_NO_TOUCH&&(Ui||"ontouchstart"in window||window.DocumentTouch&&document instanceof window.DocumentTouch),qi=ji&&Zi,Gi=ji&&Ei,Ki=(window.devicePixelRatio||window.screen.deviceXDPI/window.screen.logicalXDPI)>1,Yi=!!document.createElement("canvas").getContext,Xi=!(!document.createElementNS||!E("svg").createSVGRect),Ji=!Xi&&function(){try{var t=document.createElement("div");t.innerHTML='<v:shape adj="1"/>';var i=t.firstChild;return i.style.behavior="url(#default#VML)",i&&"object"==typeof i.adj}catch(t){return!1}}(),$i=(Object.freeze||Object)({ie:wi,ielt9:Li,edge:Pi,webkit:bi,android:Ti,android23:zi,androidStock:Ci,opera:Zi,chrome:Si,gecko:Ei,safari:ki,phantom:Ii,opera12:Ai,win:Bi,ie3d:Oi,webkit3d:Ri,gecko3d:Di,any3d:Ni,mobile:ji,mobileWebkit:Wi,mobileWebkit3d:Hi,msPointer:Fi,pointer:Ui,touch:Vi,mobileOpera:qi,mobileGecko:Gi,retina:Ki,canvas:Yi,svg:Xi,vml:Ji}),Qi=Fi?"MSPointerDown":"pointerdown",te=Fi?"MSPointerMove":"pointermove",ie=Fi?"MSPointerUp":"pointerup",ee=Fi?"MSPointerCancel":"pointercancel",ne=["INPUT","SELECT","OPTION"],oe={},se=!1,re=0,ae=Fi?"MSPointerDown":Ui?"pointerdown":"touchstart",he=Fi?"MSPointerUp":Ui?"pointerup":"touchend",ue="_leaflet_",le="_leaflet_events",ce=Bi&&Si?2*window.devicePixelRatio:Ei?window.devicePixelRatio:1,_e={},de=(Object.freeze||Object)({on:V,off:q,stopPropagation:Y,disableScrollPropagation:X,disableClickPropagation:J,preventDefault:$,stop:Q,getMousePosition:tt,getWheelDelta:it,fakeStop:et,skipped:nt,isExternalTarget:ot,addListener:V,removeListener:q}),pe=xt(["transform","WebkitTransform","OTransform","MozTransform","msTransform"]),me=xt(["webkitTransition","transition","OTransition","MozTransition","msTransition"]),fe="webkitTransition"===me||"OTransition"===me?me+"End":"transitionend";if("onselectstart"in document)mi=function(){V(window,"selectstart",$)},fi=function(){q(window,"selectstart",$)};else{var ge=xt(["userSelect","WebkitUserSelect","OUserSelect","MozUserSelect","msUserSelect"]);mi=function(){if(ge){var t=document.documentElement.style;gi=t[ge],t[ge]="none"}},fi=function(){ge&&(document.documentElement.style[ge]=gi,gi=void 0)}}var ve,ye,xe=(Object.freeze||Object)({TRANSFORM:pe,TRANSITION:me,TRANSITION_END:fe,get:rt,getStyle:at,create:ht,remove:ut,empty:lt,toFront:ct,toBack:_t,hasClass:dt,addClass:pt,removeClass:mt,setClass:ft,getClass:gt,setOpacity:vt,testProp:xt,setTransform:wt,setPosition:Lt,getPosition:Pt,disableTextSelection:mi,enableTextSelection:fi,disableImageDrag:bt,enableImageDrag:Tt,preventOutline:zt,restoreOutline:Mt}),we=ui.extend({run:function(t,i,e,n){this.stop(),this._el=t,this._inProgress=!0,this._duration=e||.25,this._easeOutPower=1/Math.max(n||.5,.2),this._startPos=Pt(t),this._offset=i.subtract(this._startPos),this._startTime=+new Date,this.fire("start"),this._animate()},stop:function(){this._inProgress&&(this._step(!0),this._complete())},_animate:function(){this._animId=f(this._animate,this),this._step()},_step:function(t){var i=+new Date-this._startTime,e=1e3*this._duration;i<e?this._runFrame(this._easeOut(i/e),t):(this._runFrame(1),this._complete())},_runFrame:function(t,i){var e=this._startPos.add(this._offset.multiplyBy(t));i&&e._round(),Lt(this._el,e),this.fire("step")},_complete:function(){g(this._animId),this._inProgress=!1,this.fire("end")},_easeOut:function(t){return 1-Math.pow(1-t,this._easeOutPower)}}),Le=ui.extend({options:{crs:vi,center:void 0,zoom:void 0,minZoom:void 0,maxZoom:void 0,layers:[],maxBounds:void 0,renderer:void 0,zoomAnimation:!0,zoomAnimationThreshold:4,fadeAnimation:!0,markerZoomAnimation:!0,transform3DLimit:8388608,zoomSnap:1,zoomDelta:1,trackResize:!0},initialize:function(t,i){i=l(this,i),this._initContainer(t),this._initLayout(),this._onResize=e(this._onResize,this),this._initEvents(),i.maxBounds&&this.setMaxBounds(i.maxBounds),void 0!==i.zoom&&(this._zoom=this._limitZoom(i.zoom)),i.center&&void 0!==i.zoom&&this.setView(C(i.center),i.zoom,{reset:!0}),this._handlers=[],this._layers={},this._zoomBoundLayers={},this._sizeChanged=!0,this.callInitHooks(),this._zoomAnimated=me&&Ni&&!qi&&this.options.zoomAnimation,this._zoomAnimated&&(this._createAnimProxy(),V(this._proxy,fe,this._catchTransitionEnd,this)),this._addLayers(this.options.layers)},setView:function(t,e,n){return e=void 0===e?this._zoom:this._limitZoom(e),t=this._limitCenter(C(t),e,this.options.maxBounds),n=n||{},this._stop(),this._loaded&&!n.reset&&!0!==n&&(void 0!==n.animate&&(n.zoom=i({animate:n.animate},n.zoom),n.pan=i({animate:n.animate,duration:n.duration},n.pan)),this._zoom!==e?this._tryAnimatedZoom&&this._tryAnimatedZoom(t,e,n.zoom):this._tryAnimatedPan(t,n.pan))?(clearTimeout(this._sizeTimer),this):(this._resetView(t,e),this)},setZoom:function(t,i){return this._loaded?this.setView(this.getCenter(),t,{zoom:i}):(this._zoom=t,this)},zoomIn:function(t,i){return t=t||(Ni?this.options.zoomDelta:1),this.setZoom(this._zoom+t,i)},zoomOut:function(t,i){return t=t||(Ni?this.options.zoomDelta:1),this.setZoom(this._zoom-t,i)},setZoomAround:function(t,i,e){var n=this.getZoomScale(i),o=this.getSize().divideBy(2),s=(t instanceof x?t:this.latLngToContainerPoint(t)).subtract(o).multiplyBy(1-1/n),r=this.containerPointToLatLng(o.add(s));return this.setView(r,i,{zoom:e})},_getBoundsCenterZoom:function(t,i){i=i||{},t=t.getBounds?t.getBounds():z(t);var e=w(i.paddingTopLeft||i.padding||[0,0]),n=w(i.paddingBottomRight||i.padding||[0,0]),o=this.getBoundsZoom(t,!1,e.add(n));if((o="number"==typeof i.maxZoom?Math.min(i.maxZoom,o):o)===1/0)return{center:t.getCenter(),zoom:o};var s=n.subtract(e).divideBy(2),r=this.project(t.getSouthWest(),o),a=this.project(t.getNorthEast(),o);return{center:this.unproject(r.add(a).divideBy(2).add(s),o),zoom:o}},fitBounds:function(t,i){if(!(t=z(t)).isValid())throw new Error("Bounds are not valid.");var e=this._getBoundsCenterZoom(t,i);return this.setView(e.center,e.zoom,i)},fitWorld:function(t){return this.fitBounds([[-90,-180],[90,180]],t)},panTo:function(t,i){return this.setView(t,this._zoom,{pan:i})},panBy:function(t,i){if(t=w(t).round(),i=i||{},!t.x&&!t.y)return this.fire("moveend");if(!0!==i.animate&&!this.getSize().contains(t))return this._resetView(this.unproject(this.project(this.getCenter()).add(t)),this.getZoom()),this;if(this._panAnim||(this._panAnim=new we,this._panAnim.on({step:this._onPanTransitionStep,end:this._onPanTransitionEnd},this)),i.noMoveStart||this.fire("movestart"),!1!==i.animate){pt(this._mapPane,"leaflet-pan-anim");var e=this._getMapPanePos().subtract(t).round();this._panAnim.run(this._mapPane,e,i.duration||.25,i.easeLinearity)}else this._rawPanBy(t),this.fire("move").fire("moveend");return this},flyTo:function(t,i,e){function n(t){var i=(g*g-m*m+(t?-1:1)*x*x*v*v)/(2*(t?g:m)*x*v),e=Math.sqrt(i*i+1)-i;return e<1e-9?-18:Math.log(e)}function o(t){return(Math.exp(t)-Math.exp(-t))/2}function s(t){return(Math.exp(t)+Math.exp(-t))/2}function r(t){return o(t)/s(t)}function a(t){return m*(s(w)/s(w+y*t))}function h(t){return m*(s(w)*r(w+y*t)-o(w))/x}function u(t){return 1-Math.pow(1-t,1.5)}function l(){var e=(Date.now()-L)/b,n=u(e)*P;e<=1?(this._flyToFrame=f(l,this),this._move(this.unproject(c.add(_.subtract(c).multiplyBy(h(n)/v)),p),this.getScaleZoom(m/a(n),p),{flyTo:!0})):this._move(t,i)._moveEnd(!0)}if(!1===(e=e||{}).animate||!Ni)return this.setView(t,i,e);this._stop();var c=this.project(this.getCenter()),_=this.project(t),d=this.getSize(),p=this._zoom;t=C(t),i=void 0===i?p:i;var m=Math.max(d.x,d.y),g=m*this.getZoomScale(p,i),v=_.distanceTo(c)||1,y=1.42,x=y*y,w=n(0),L=Date.now(),P=(n(1)-w)/y,b=e.duration?1e3*e.duration:1e3*P*.8;return this._moveStart(!0,e.noMoveStart),l.call(this),this},flyToBounds:function(t,i){var e=this._getBoundsCenterZoom(t,i);return this.flyTo(e.center,e.zoom,i)},setMaxBounds:function(t){return(t=z(t)).isValid()?(this.options.maxBounds&&this.off("moveend",this._panInsideMaxBounds),this.options.maxBounds=t,this._loaded&&this._panInsideMaxBounds(),this.on("moveend",this._panInsideMaxBounds)):(this.options.maxBounds=null,this.off("moveend",this._panInsideMaxBounds))},setMinZoom:function(t){var i=this.options.minZoom;return this.options.minZoom=t,this._loaded&&i!==t&&(this.fire("zoomlevelschange"),this.getZoom()<this.options.minZoom)?this.setZoom(t):this},setMaxZoom:function(t){var i=this.options.maxZoom;return this.options.maxZoom=t,this._loaded&&i!==t&&(this.fire("zoomlevelschange"),this.getZoom()>this.options.maxZoom)?this.setZoom(t):this},panInsideBounds:function(t,i){this._enforcingBounds=!0;var e=this.getCenter(),n=this._limitCenter(e,this._zoom,z(t));return e.equals(n)||this.panTo(n,i),this._enforcingBounds=!1,this},invalidateSize:function(t){if(!this._loaded)return this;t=i({animate:!1,pan:!0},!0===t?{animate:!0}:t);var n=this.getSize();this._sizeChanged=!0,this._lastCenter=null;var o=this.getSize(),s=n.divideBy(2).round(),r=o.divideBy(2).round(),a=s.subtract(r);return a.x||a.y?(t.animate&&t.pan?this.panBy(a):(t.pan&&this._rawPanBy(a),this.fire("move"),t.debounceMoveend?(clearTimeout(this._sizeTimer),this._sizeTimer=setTimeout(e(this.fire,this,"moveend"),200)):this.fire("moveend")),this.fire("resize",{oldSize:n,newSize:o})):this},stop:function(){return this.setZoom(this._limitZoom(this._zoom)),this.options.zoomSnap||this.fire("viewreset"),this._stop()},locate:function(t){if(t=this._locateOptions=i({timeout:1e4,watch:!1},t),!("geolocation"in navigator))return this._handleGeolocationError({code:0,message:"Geolocation not supported."}),this;var n=e(this._handleGeolocationResponse,this),o=e(this._handleGeolocationError,this);return t.watch?this._locationWatchId=navigator.geolocation.watchPosition(n,o,t):navigator.geolocation.getCurrentPosition(n,o,t),this},stopLocate:function(){return navigator.geolocation&&navigator.geolocation.clearWatch&&navigator.geolocation.clearWatch(this._locationWatchId),this._locateOptions&&(this._locateOptions.setView=!1),this},_handleGeolocationError:function(t){var i=t.code,e=t.message||(1===i?"permission denied":2===i?"position unavailable":"timeout");this._locateOptions.setView&&!this._loaded&&this.fitWorld(),this.fire("locationerror",{code:i,message:"Geolocation error: "+e+"."})},_handleGeolocationResponse:function(t){var i=new M(t.coords.latitude,t.coords.longitude),e=i.toBounds(t.coords.accuracy),n=this._locateOptions;if(n.setView){var o=this.getBoundsZoom(e);this.setView(i,n.maxZoom?Math.min(o,n.maxZoom):o)}var s={latlng:i,bounds:e,timestamp:t.timestamp};for(var r in t.coords)"number"==typeof t.coords[r]&&(s[r]=t.coords[r]);this.fire("locationfound",s)},addHandler:function(t,i){if(!i)return this;var e=this[t]=new i(this);return this._handlers.push(e),this.options[t]&&e.enable(),this},remove:function(){if(this._initEvents(!0),this._containerId!==this._container._leaflet_id)throw new Error("Map container is being reused by another instance");try{delete this._container._leaflet_id,delete this._containerId}catch(t){this._container._leaflet_id=void 0,this._containerId=void 0}void 0!==this._locationWatchId&&this.stopLocate(),this._stop(),ut(this._mapPane),this._clearControlPos&&this._clearControlPos(),this._clearHandlers(),this._loaded&&this.fire("unload");var t;for(t in this._layers)this._layers[t].remove();for(t in this._panes)ut(this._panes[t]);return this._layers=[],this._panes=[],delete this._mapPane,delete this._renderer,this},createPane:function(t,i){var e=ht("div","leaflet-pane"+(t?" leaflet-"+t.replace("Pane","")+"-pane":""),i||this._mapPane);return t&&(this._panes[t]=e),e},getCenter:function(){return this._checkIfLoaded(),this._lastCenter&&!this._moved()?this._lastCenter:this.layerPointToLatLng(this._getCenterLayerPoint())},getZoom:function(){return this._zoom},getBounds:function(){var t=this.getPixelBounds();return new T(this.unproject(t.getBottomLeft()),this.unproject(t.getTopRight()))},getMinZoom:function(){return void 0===this.options.minZoom?this._layersMinZoom||0:this.options.minZoom},getMaxZoom:function(){return void 0===this.options.maxZoom?void 0===this._layersMaxZoom?1/0:this._layersMaxZoom:this.options.maxZoom},getBoundsZoom:function(t,i,e){t=z(t),e=w(e||[0,0]);var n=this.getZoom()||0,o=this.getMinZoom(),s=this.getMaxZoom(),r=t.getNorthWest(),a=t.getSouthEast(),h=this.getSize().subtract(e),u=b(this.project(a,n),this.project(r,n)).getSize(),l=Ni?this.options.zoomSnap:1,c=h.x/u.x,_=h.y/u.y,d=i?Math.max(c,_):Math.min(c,_);return n=this.getScaleZoom(d,n),l&&(n=Math.round(n/(l/100))*(l/100),n=i?Math.ceil(n/l)*l:Math.floor(n/l)*l),Math.max(o,Math.min(s,n))},getSize:function(){return this._size&&!this._sizeChanged||(this._size=new x(this._container.clientWidth||0,this._container.clientHeight||0),this._sizeChanged=!1),this._size.clone()},getPixelBounds:function(t,i){var e=this._getTopLeftPoint(t,i);return new P(e,e.add(this.getSize()))},getPixelOrigin:function(){return this._checkIfLoaded(),this._pixelOrigin},getPixelWorldBounds:function(t){return this.options.crs.getProjectedBounds(void 0===t?this.getZoom():t)},getPane:function(t){return"string"==typeof t?this._panes[t]:t},getPanes:function(){return this._panes},getContainer:function(){return this._container},getZoomScale:function(t,i){var e=this.options.crs;return i=void 0===i?this._zoom:i,e.scale(t)/e.scale(i)},getScaleZoom:function(t,i){var e=this.options.crs;i=void 0===i?this._zoom:i;var n=e.zoom(t*e.scale(i));return isNaN(n)?1/0:n},project:function(t,i){return i=void 0===i?this._zoom:i,this.options.crs.latLngToPoint(C(t),i)},unproject:function(t,i){return i=void 0===i?this._zoom:i,this.options.crs.pointToLatLng(w(t),i)},layerPointToLatLng:function(t){var i=w(t).add(this.getPixelOrigin());return this.unproject(i)},latLngToLayerPoint:function(t){return this.project(C(t))._round()._subtract(this.getPixelOrigin())},wrapLatLng:function(t){return this.options.crs.wrapLatLng(C(t))},wrapLatLngBounds:function(t){return this.options.crs.wrapLatLngBounds(z(t))},distance:function(t,i){return this.options.crs.distance(C(t),C(i))},containerPointToLayerPoint:function(t){return w(t).subtract(this._getMapPanePos())},layerPointToContainerPoint:function(t){return w(t).add(this._getMapPanePos())},containerPointToLatLng:function(t){var i=this.containerPointToLayerPoint(w(t));return this.layerPointToLatLng(i)},latLngToContainerPoint:function(t){return this.layerPointToContainerPoint(this.latLngToLayerPoint(C(t)))},mouseEventToContainerPoint:function(t){return tt(t,this._container)},mouseEventToLayerPoint:function(t){return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(t))},mouseEventToLatLng:function(t){return this.layerPointToLatLng(this.mouseEventToLayerPoint(t))},_initContainer:function(t){var i=this._container=rt(t);if(!i)throw new Error("Map container not found.");if(i._leaflet_id)throw new Error("Map container is already initialized.");V(i,"scroll",this._onScroll,this),this._containerId=n(i)},_initLayout:function(){var t=this._container;this._fadeAnimated=this.options.fadeAnimation&&Ni,pt(t,"leaflet-container"+(Vi?" leaflet-touch":"")+(Ki?" leaflet-retina":"")+(Li?" leaflet-oldie":"")+(ki?" leaflet-safari":"")+(this._fadeAnimated?" leaflet-fade-anim":""));var i=at(t,"position");"absolute"!==i&&"relative"!==i&&"fixed"!==i&&(t.style.position="relative"),this._initPanes(),this._initControlPos&&this._initControlPos()},_initPanes:function(){var t=this._panes={};this._paneRenderers={},this._mapPane=this.createPane("mapPane",this._container),Lt(this._mapPane,new x(0,0)),this.createPane("tilePane"),this.createPane("shadowPane"),this.createPane("overlayPane"),this.createPane("markerPane"),this.createPane("tooltipPane"),this.createPane("popupPane"),this.options.markerZoomAnimation||(pt(t.markerPane,"leaflet-zoom-hide"),pt(t.shadowPane,"leaflet-zoom-hide"))},_resetView:function(t,i){Lt(this._mapPane,new x(0,0));var e=!this._loaded;this._loaded=!0,i=this._limitZoom(i),this.fire("viewprereset");var n=this._zoom!==i;this._moveStart(n,!1)._move(t,i)._moveEnd(n),this.fire("viewreset"),e&&this.fire("load")},_moveStart:function(t,i){return t&&this.fire("zoomstart"),i||this.fire("movestart"),this},_move:function(t,i,e){void 0===i&&(i=this._zoom);var n=this._zoom!==i;return this._zoom=i,this._lastCenter=t,this._pixelOrigin=this._getNewPixelOrigin(t),(n||e&&e.pinch)&&this.fire("zoom",e),this.fire("move",e)},_moveEnd:function(t){return t&&this.fire("zoomend"),this.fire("moveend")},_stop:function(){return g(this._flyToFrame),this._panAnim&&this._panAnim.stop(),this},_rawPanBy:function(t){Lt(this._mapPane,this._getMapPanePos().subtract(t))},_getZoomSpan:function(){return this.getMaxZoom()-this.getMinZoom()},_panInsideMaxBounds:function(){this._enforcingBounds||this.panInsideBounds(this.options.maxBounds)},_checkIfLoaded:function(){if(!this._loaded)throw new Error("Set map center and zoom first.")},_initEvents:function(t){this._targets={},this._targets[n(this._container)]=this;var i=t?q:V;i(this._container,"click dblclick mousedown mouseup mouseover mouseout mousemove contextmenu keypress",this._handleDOMEvent,this),this.options.trackResize&&i(window,"resize",this._onResize,this),Ni&&this.options.transform3DLimit&&(t?this.off:this.on).call(this,"moveend",this._onMoveEnd)},_onResize:function(){g(this._resizeRequest),this._resizeRequest=f(function(){this.invalidateSize({debounceMoveend:!0})},this)},_onScroll:function(){this._container.scrollTop=0,this._container.scrollLeft=0},_onMoveEnd:function(){var t=this._getMapPanePos();Math.max(Math.abs(t.x),Math.abs(t.y))>=this.options.transform3DLimit&&this._resetView(this.getCenter(),this.getZoom())},_findEventTargets:function(t,i){for(var e,o=[],s="mouseout"===i||"mouseover"===i,r=t.target||t.srcElement,a=!1;r;){if((e=this._targets[n(r)])&&("click"===i||"preclick"===i)&&!t._simulated&&this._draggableMoved(e)){a=!0;break}if(e&&e.listens(i,!0)){if(s&&!ot(r,t))break;if(o.push(e),s)break}if(r===this._container)break;r=r.parentNode}return o.length||a||s||!ot(r,t)||(o=[this]),o},_handleDOMEvent:function(t){if(this._loaded&&!nt(t)){var i=t.type;"mousedown"!==i&&"keypress"!==i||zt(t.target||t.srcElement),this._fireDOMEvent(t,i)}},_mouseEvents:["click","dblclick","mouseover","mouseout","contextmenu"],_fireDOMEvent:function(t,e,n){if("click"===t.type){var o=i({},t);o.type="preclick",this._fireDOMEvent(o,o.type,n)}if(!t._stopped&&(n=(n||[]).concat(this._findEventTargets(t,e))).length){var s=n[0];"contextmenu"===e&&s.listens(e,!0)&&$(t);var r={originalEvent:t};if("keypress"!==t.type){var a=s.getLatLng&&(!s._radius||s._radius<=10);r.containerPoint=a?this.latLngToContainerPoint(s.getLatLng()):this.mouseEventToContainerPoint(t),r.layerPoint=this.containerPointToLayerPoint(r.containerPoint),r.latlng=a?s.getLatLng():this.layerPointToLatLng(r.layerPoint)}for(var h=0;h<n.length;h++)if(n[h].fire(e,r,!0),r.originalEvent._stopped||!1===n[h].options.bubblingMouseEvents&&-1!==d(this._mouseEvents,e))return}},_draggableMoved:function(t){return(t=t.dragging&&t.dragging.enabled()?t:this).dragging&&t.dragging.moved()||this.boxZoom&&this.boxZoom.moved()},_clearHandlers:function(){for(var t=0,i=this._handlers.length;t<i;t++)this._handlers[t].disable()},whenReady:function(t,i){return this._loaded?t.call(i||this,{target:this}):this.on("load",t,i),this},_getMapPanePos:function(){return Pt(this._mapPane)||new x(0,0)},_moved:function(){var t=this._getMapPanePos();return t&&!t.equals([0,0])},_getTopLeftPoint:function(t,i){return(t&&void 0!==i?this._getNewPixelOrigin(t,i):this.getPixelOrigin()).subtract(this._getMapPanePos())},_getNewPixelOrigin:function(t,i){var e=this.getSize()._divideBy(2);return this.project(t,i)._subtract(e)._add(this._getMapPanePos())._round()},_latLngToNewLayerPoint:function(t,i,e){var n=this._getNewPixelOrigin(e,i);return this.project(t,i)._subtract(n)},_latLngBoundsToNewLayerBounds:function(t,i,e){var n=this._getNewPixelOrigin(e,i);return b([this.project(t.getSouthWest(),i)._subtract(n),this.project(t.getNorthWest(),i)._subtract(n),this.project(t.getSouthEast(),i)._subtract(n),this.project(t.getNorthEast(),i)._subtract(n)])},_getCenterLayerPoint:function(){return this.containerPointToLayerPoint(this.getSize()._divideBy(2))},_getCenterOffset:function(t){return this.latLngToLayerPoint(t).subtract(this._getCenterLayerPoint())},_limitCenter:function(t,i,e){if(!e)return t;var n=this.project(t,i),o=this.getSize().divideBy(2),s=new P(n.subtract(o),n.add(o)),r=this._getBoundsOffset(s,e,i);return r.round().equals([0,0])?t:this.unproject(n.add(r),i)},_limitOffset:function(t,i){if(!i)return t;var e=this.getPixelBounds(),n=new P(e.min.add(t),e.max.add(t));return t.add(this._getBoundsOffset(n,i))},_getBoundsOffset:function(t,i,e){var n=b(this.project(i.getNorthEast(),e),this.project(i.getSouthWest(),e)),o=n.min.subtract(t.min),s=n.max.subtract(t.max);return new x(this._rebound(o.x,-s.x),this._rebound(o.y,-s.y))},_rebound:function(t,i){return t+i>0?Math.round(t-i)/2:Math.max(0,Math.ceil(t))-Math.max(0,Math.floor(i))},_limitZoom:function(t){var i=this.getMinZoom(),e=this.getMaxZoom(),n=Ni?this.options.zoomSnap:1;return n&&(t=Math.round(t/n)*n),Math.max(i,Math.min(e,t))},_onPanTransitionStep:function(){this.fire("move")},_onPanTransitionEnd:function(){mt(this._mapPane,"leaflet-pan-anim"),this.fire("moveend")},_tryAnimatedPan:function(t,i){var e=this._getCenterOffset(t)._trunc();return!(!0!==(i&&i.animate)&&!this.getSize().contains(e))&&(this.panBy(e,i),!0)},_createAnimProxy:function(){var t=this._proxy=ht("div","leaflet-proxy leaflet-zoom-animated");this._panes.mapPane.appendChild(t),this.on("zoomanim",function(t){var i=pe,e=this._proxy.style[i];wt(this._proxy,this.project(t.center,t.zoom),this.getZoomScale(t.zoom,1)),e===this._proxy.style[i]&&this._animatingZoom&&this._onZoomTransitionEnd()},this),this.on("load moveend",function(){var t=this.getCenter(),i=this.getZoom();wt(this._proxy,this.project(t,i),this.getZoomScale(i,1))},this),this._on("unload",this._destroyAnimProxy,this)},_destroyAnimProxy:function(){ut(this._proxy),delete this._proxy},_catchTransitionEnd:function(t){this._animatingZoom&&t.propertyName.indexOf("transform")>=0&&this._onZoomTransitionEnd()},_nothingToAnimate:function(){return!this._container.getElementsByClassName("leaflet-zoom-animated").length},_tryAnimatedZoom:function(t,i,e){if(this._animatingZoom)return!0;if(e=e||{},!this._zoomAnimated||!1===e.animate||this._nothingToAnimate()||Math.abs(i-this._zoom)>this.options.zoomAnimationThreshold)return!1;var n=this.getZoomScale(i),o=this._getCenterOffset(t)._divideBy(1-1/n);return!(!0!==e.animate&&!this.getSize().contains(o))&&(f(function(){this._moveStart(!0,!1)._animateZoom(t,i,!0)},this),!0)},_animateZoom:function(t,i,n,o){this._mapPane&&(n&&(this._animatingZoom=!0,this._animateToCenter=t,this._animateToZoom=i,pt(this._mapPane,"leaflet-zoom-anim")),this.fire("zoomanim",{center:t,zoom:i,noUpdate:o}),setTimeout(e(this._onZoomTransitionEnd,this),250))},_onZoomTransitionEnd:function(){this._animatingZoom&&(this._mapPane&&mt(this._mapPane,"leaflet-zoom-anim"),this._animatingZoom=!1,this._move(this._animateToCenter,this._animateToZoom),f(function(){this._moveEnd(!0)},this))}}),Pe=v.extend({options:{position:"topright"},initialize:function(t){l(this,t)},getPosition:function(){return this.options.position},setPosition:function(t){var i=this._map;return i&&i.removeControl(this),this.options.position=t,i&&i.addControl(this),this},getContainer:function(){return this._container},addTo:function(t){this.remove(),this._map=t;var i=this._container=this.onAdd(t),e=this.getPosition(),n=t._controlCorners[e];return pt(i,"leaflet-control"),-1!==e.indexOf("bottom")?n.insertBefore(i,n.firstChild):n.appendChild(i),this},remove:function(){return this._map?(ut(this._container),this.onRemove&&this.onRemove(this._map),this._map=null,this):this},_refocusOnMap:function(t){this._map&&t&&t.screenX>0&&t.screenY>0&&this._map.getContainer().focus()}}),be=function(t){return new Pe(t)};Le.include({addControl:function(t){return t.addTo(this),this},removeControl:function(t){return t.remove(),this},_initControlPos:function(){function t(t,o){var s=e+t+" "+e+o;i[t+o]=ht("div",s,n)}var i=this._controlCorners={},e="leaflet-",n=this._controlContainer=ht("div",e+"control-container",this._container);t("top","left"),t("top","right"),t("bottom","left"),t("bottom","right")},_clearControlPos:function(){for(var t in this._controlCorners)ut(this._controlCorners[t]);ut(this._controlContainer),delete this._controlCorners,delete this._controlContainer}});var Te=Pe.extend({options:{collapsed:!0,position:"topright",autoZIndex:!0,hideSingleBase:!1,sortLayers:!1,sortFunction:function(t,i,e,n){return e<n?-1:n<e?1:0}},initialize:function(t,i,e){l(this,e),this._layerControlInputs=[],this._layers=[],this._lastZIndex=0,this._handlingClick=!1;for(var n in t)this._addLayer(t[n],n);for(n in i)this._addLayer(i[n],n,!0)},onAdd:function(t){this._initLayout(),this._update(),this._map=t,t.on("zoomend",this._checkDisabledLayers,this);for(var i=0;i<this._layers.length;i++)this._layers[i].layer.on("add remove",this._onLayerChange,this);return this._container},addTo:function(t){return Pe.prototype.addTo.call(this,t),this._expandIfNotCollapsed()},onRemove:function(){this._map.off("zoomend",this._checkDisabledLayers,this);for(var t=0;t<this._layers.length;t++)this._layers[t].layer.off("add remove",this._onLayerChange,this)},addBaseLayer:function(t,i){return this._addLayer(t,i),this._map?this._update():this},addOverlay:function(t,i){return this._addLayer(t,i,!0),this._map?this._update():this},removeLayer:function(t){t.off("add remove",this._onLayerChange,this);var i=this._getLayer(n(t));return i&&this._layers.splice(this._layers.indexOf(i),1),this._map?this._update():this},expand:function(){pt(this._container,"leaflet-control-layers-expanded"),this._form.style.height=null;var t=this._map.getSize().y-(this._container.offsetTop+50);return t<this._form.clientHeight?(pt(this._form,"leaflet-control-layers-scrollbar"),this._form.style.height=t+"px"):mt(this._form,"leaflet-control-layers-scrollbar"),this._checkDisabledLayers(),this},collapse:function(){return mt(this._container,"leaflet-control-layers-expanded"),this},_initLayout:function(){var t="leaflet-control-layers",i=this._container=ht("div",t),e=this.options.collapsed;i.setAttribute("aria-haspopup",!0),J(i),X(i);var n=this._form=ht("form",t+"-list");e&&(this._map.on("click",this.collapse,this),Ti||V(i,{mouseenter:this.expand,mouseleave:this.collapse},this));var o=this._layersLink=ht("a",t+"-toggle",i);o.href="#",o.title="Layers",Vi?(V(o,"click",Q),V(o,"click",this.expand,this)):V(o,"focus",this.expand,this),e||this.expand(),this._baseLayersList=ht("div",t+"-base",n),this._separator=ht("div",t+"-separator",n),this._overlaysList=ht("div",t+"-overlays",n),i.appendChild(n)},_getLayer:function(t){for(var i=0;i<this._layers.length;i++)if(this._layers[i]&&n(this._layers[i].layer)===t)return this._layers[i]},_addLayer:function(t,i,n){this._map&&t.on("add remove",this._onLayerChange,this),this._layers.push({layer:t,name:i,overlay:n}),this.options.sortLayers&&this._layers.sort(e(function(t,i){return this.options.sortFunction(t.layer,i.layer,t.name,i.name)},this)),this.options.autoZIndex&&t.setZIndex&&(this._lastZIndex++,t.setZIndex(this._lastZIndex)),this._expandIfNotCollapsed()},_update:function(){if(!this._container)return this;lt(this._baseLayersList),lt(this._overlaysList),this._layerControlInputs=[];var t,i,e,n,o=0;for(e=0;e<this._layers.length;e++)n=this._layers[e],this._addItem(n),i=i||n.overlay,t=t||!n.overlay,o+=n.overlay?0:1;return this.options.hideSingleBase&&(t=t&&o>1,this._baseLayersList.style.display=t?"":"none"),this._separator.style.display=i&&t?"":"none",this},_onLayerChange:function(t){this._handlingClick||this._update();var i=this._getLayer(n(t.target)),e=i.overlay?"add"===t.type?"overlayadd":"overlayremove":"add"===t.type?"baselayerchange":null;e&&this._map.fire(e,i)},_createRadioElement:function(t,i){var e='<input type="radio" class="leaflet-control-layers-selector" name="'+t+'"'+(i?' checked="checked"':"")+"/>",n=document.createElement("div");return n.innerHTML=e,n.firstChild},_addItem:function(t){var i,e=document.createElement("label"),o=this._map.hasLayer(t.layer);t.overlay?((i=document.createElement("input")).type="checkbox",i.className="leaflet-control-layers-selector",i.defaultChecked=o):i=this._createRadioElement("leaflet-base-layers",o),this._layerControlInputs.push(i),i.layerId=n(t.layer),V(i,"click",this._onInputClick,this);var s=document.createElement("span");s.innerHTML=" "+t.name;var r=document.createElement("div");return e.appendChild(r),r.appendChild(i),r.appendChild(s),(t.overlay?this._overlaysList:this._baseLayersList).appendChild(e),this._checkDisabledLayers(),e},_onInputClick:function(){var t,i,e=this._layerControlInputs,n=[],o=[];this._handlingClick=!0;for(var s=e.length-1;s>=0;s--)t=e[s],i=this._getLayer(t.layerId).layer,t.checked?n.push(i):t.checked||o.push(i);for(s=0;s<o.length;s++)this._map.hasLayer(o[s])&&this._map.removeLayer(o[s]);for(s=0;s<n.length;s++)this._map.hasLayer(n[s])||this._map.addLayer(n[s]);this._handlingClick=!1,this._refocusOnMap()},_checkDisabledLayers:function(){for(var t,i,e=this._layerControlInputs,n=this._map.getZoom(),o=e.length-1;o>=0;o--)t=e[o],i=this._getLayer(t.layerId).layer,t.disabled=void 0!==i.options.minZoom&&n<i.options.minZoom||void 0!==i.options.maxZoom&&n>i.options.maxZoom},_expandIfNotCollapsed:function(){return this._map&&!this.options.collapsed&&this.expand(),this},_expand:function(){return this.expand()},_collapse:function(){return this.collapse()}}),ze=Pe.extend({options:{position:"topleft",zoomInText:"+",zoomInTitle:"Zoom in",zoomOutText:"&#x2212;",zoomOutTitle:"Zoom out"},onAdd:function(t){var i="leaflet-control-zoom",e=ht("div",i+" leaflet-bar"),n=this.options;return this._zoomInButton=this._createButton(n.zoomInText,n.zoomInTitle,i+"-in",e,this._zoomIn),this._zoomOutButton=this._createButton(n.zoomOutText,n.zoomOutTitle,i+"-out",e,this._zoomOut),this._updateDisabled(),t.on("zoomend zoomlevelschange",this._updateDisabled,this),e},onRemove:function(t){t.off("zoomend zoomlevelschange",this._updateDisabled,this)},disable:function(){return this._disabled=!0,this._updateDisabled(),this},enable:function(){return this._disabled=!1,this._updateDisabled(),this},_zoomIn:function(t){!this._disabled&&this._map._zoom<this._map.getMaxZoom()&&this._map.zoomIn(this._map.options.zoomDelta*(t.shiftKey?3:1))},_zoomOut:function(t){!this._disabled&&this._map._zoom>this._map.getMinZoom()&&this._map.zoomOut(this._map.options.zoomDelta*(t.shiftKey?3:1))},_createButton:function(t,i,e,n,o){var s=ht("a",e,n);return s.innerHTML=t,s.href="#",s.title=i,s.setAttribute("role","button"),s.setAttribute("aria-label",i),J(s),V(s,"click",Q),V(s,"click",o,this),V(s,"click",this._refocusOnMap,this),s},_updateDisabled:function(){var t=this._map,i="leaflet-disabled";mt(this._zoomInButton,i),mt(this._zoomOutButton,i),(this._disabled||t._zoom===t.getMinZoom())&&pt(this._zoomOutButton,i),(this._disabled||t._zoom===t.getMaxZoom())&&pt(this._zoomInButton,i)}});Le.mergeOptions({zoomControl:!0}),Le.addInitHook(function(){this.options.zoomControl&&(this.zoomControl=new ze,this.addControl(this.zoomControl))});var Me=Pe.extend({options:{position:"bottomleft",maxWidth:100,metric:!0,imperial:!0},onAdd:function(t){var i=ht("div","leaflet-control-scale"),e=this.options;return this._addScales(e,"leaflet-control-scale-line",i),t.on(e.updateWhenIdle?"moveend":"move",this._update,this),t.whenReady(this._update,this),i},onRemove:function(t){t.off(this.options.updateWhenIdle?"moveend":"move",this._update,this)},_addScales:function(t,i,e){t.metric&&(this._mScale=ht("div",i,e)),t.imperial&&(this._iScale=ht("div",i,e))},_update:function(){var t=this._map,i=t.getSize().y/2,e=t.distance(t.containerPointToLatLng([0,i]),t.containerPointToLatLng([this.options.maxWidth,i]));this._updateScales(e)},_updateScales:function(t){this.options.metric&&t&&this._updateMetric(t),this.options.imperial&&t&&this._updateImperial(t)},_updateMetric:function(t){var i=this._getRoundNum(t),e=i<1e3?i+" m":i/1e3+" km";this._updateScale(this._mScale,e,i/t)},_updateImperial:function(t){var i,e,n,o=3.2808399*t;o>5280?(i=o/5280,e=this._getRoundNum(i),this._updateScale(this._iScale,e+" mi",e/i)):(n=this._getRoundNum(o),this._updateScale(this._iScale,n+" ft",n/o))},_updateScale:function(t,i,e){t.style.width=Math.round(this.options.maxWidth*e)+"px",t.innerHTML=i},_getRoundNum:function(t){var i=Math.pow(10,(Math.floor(t)+"").length-1),e=t/i;return e=e>=10?10:e>=5?5:e>=3?3:e>=2?2:1,i*e}}),Ce=Pe.extend({options:{position:"bottomright",prefix:'<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>'},initialize:function(t){l(this,t),this._attributions={}},onAdd:function(t){t.attributionControl=this,this._container=ht("div","leaflet-control-attribution"),J(this._container);for(var i in t._layers)t._layers[i].getAttribution&&this.addAttribution(t._layers[i].getAttribution());return this._update(),this._container},setPrefix:function(t){return this.options.prefix=t,this._update(),this},addAttribution:function(t){return t?(this._attributions[t]||(this._attributions[t]=0),this._attributions[t]++,this._update(),this):this},removeAttribution:function(t){return t?(this._attributions[t]&&(this._attributions[t]--,this._update()),this):this},_update:function(){if(this._map){var t=[];for(var i in this._attributions)this._attributions[i]&&t.push(i);var e=[];this.options.prefix&&e.push(this.options.prefix),t.length&&e.push(t.join(", ")),this._container.innerHTML=e.join(" | ")}}});Le.mergeOptions({attributionControl:!0}),Le.addInitHook(function(){this.options.attributionControl&&(new Ce).addTo(this)});Pe.Layers=Te,Pe.Zoom=ze,Pe.Scale=Me,Pe.Attribution=Ce,be.layers=function(t,i,e){return new Te(t,i,e)},be.zoom=function(t){return new ze(t)},be.scale=function(t){return new Me(t)},be.attribution=function(t){return new Ce(t)};var Ze=v.extend({initialize:function(t){this._map=t},enable:function(){return this._enabled?this:(this._enabled=!0,this.addHooks(),this)},disable:function(){return this._enabled?(this._enabled=!1,this.removeHooks(),this):this},enabled:function(){return!!this._enabled}});Ze.addTo=function(t,i){return t.addHandler(i,this),this};var Se,Ee={Events:hi},ke=Vi?"touchstart mousedown":"mousedown",Ie={mousedown:"mouseup",touchstart:"touchend",pointerdown:"touchend",MSPointerDown:"touchend"},Ae={mousedown:"mousemove",touchstart:"touchmove",pointerdown:"touchmove",MSPointerDown:"touchmove"},Be=ui.extend({options:{clickTolerance:3},initialize:function(t,i,e,n){l(this,n),this._element=t,this._dragStartTarget=i||t,this._preventOutline=e},enable:function(){this._enabled||(V(this._dragStartTarget,ke,this._onDown,this),this._enabled=!0)},disable:function(){this._enabled&&(Be._dragging===this&&this.finishDrag(),q(this._dragStartTarget,ke,this._onDown,this),this._enabled=!1,this._moved=!1)},_onDown:function(t){if(!t._simulated&&this._enabled&&(this._moved=!1,!dt(this._element,"leaflet-zoom-anim")&&!(Be._dragging||t.shiftKey||1!==t.which&&1!==t.button&&!t.touches||(Be._dragging=this,this._preventOutline&&zt(this._element),bt(),mi(),this._moving)))){this.fire("down");var i=t.touches?t.touches[0]:t;this._startPoint=new x(i.clientX,i.clientY),V(document,Ae[t.type],this._onMove,this),V(document,Ie[t.type],this._onUp,this)}},_onMove:function(t){if(!t._simulated&&this._enabled)if(t.touches&&t.touches.length>1)this._moved=!0;else{var i=t.touches&&1===t.touches.length?t.touches[0]:t,e=new x(i.clientX,i.clientY).subtract(this._startPoint);(e.x||e.y)&&(Math.abs(e.x)+Math.abs(e.y)<this.options.clickTolerance||($(t),this._moved||(this.fire("dragstart"),this._moved=!0,this._startPos=Pt(this._element).subtract(e),pt(document.body,"leaflet-dragging"),this._lastTarget=t.target||t.srcElement,window.SVGElementInstance&&this._lastTarget instanceof SVGElementInstance&&(this._lastTarget=this._lastTarget.correspondingUseElement),pt(this._lastTarget,"leaflet-drag-target")),this._newPos=this._startPos.add(e),this._moving=!0,g(this._animRequest),this._lastEvent=t,this._animRequest=f(this._updatePosition,this,!0)))}},_updatePosition:function(){var t={originalEvent:this._lastEvent};this.fire("predrag",t),Lt(this._element,this._newPos),this.fire("drag",t)},_onUp:function(t){!t._simulated&&this._enabled&&this.finishDrag()},finishDrag:function(){mt(document.body,"leaflet-dragging"),this._lastTarget&&(mt(this._lastTarget,"leaflet-drag-target"),this._lastTarget=null);for(var t in Ae)q(document,Ae[t],this._onMove,this),q(document,Ie[t],this._onUp,this);Tt(),fi(),this._moved&&this._moving&&(g(this._animRequest),this.fire("dragend",{distance:this._newPos.distanceTo(this._startPos)})),this._moving=!1,Be._dragging=!1}}),Oe=(Object.freeze||Object)({simplify:Ct,pointToSegmentDistance:Zt,closestPointOnSegment:function(t,i,e){return Rt(t,i,e)},clipSegment:It,_getEdgeIntersection:At,_getBitCode:Bt,_sqClosestPointOnSegment:Rt,isFlat:Dt,_flat:Nt}),Re=(Object.freeze||Object)({clipPolygon:jt}),De={project:function(t){return new x(t.lng,t.lat)},unproject:function(t){return new M(t.y,t.x)},bounds:new P([-180,-90],[180,90])},Ne={R:6378137,R_MINOR:6356752.314245179,bounds:new P([-20037508.34279,-15496570.73972],[20037508.34279,18764656.23138]),project:function(t){var i=Math.PI/180,e=this.R,n=t.lat*i,o=this.R_MINOR/e,s=Math.sqrt(1-o*o),r=s*Math.sin(n),a=Math.tan(Math.PI/4-n/2)/Math.pow((1-r)/(1+r),s/2);return n=-e*Math.log(Math.max(a,1e-10)),new x(t.lng*i*e,n)},unproject:function(t){for(var i,e=180/Math.PI,n=this.R,o=this.R_MINOR/n,s=Math.sqrt(1-o*o),r=Math.exp(-t.y/n),a=Math.PI/2-2*Math.atan(r),h=0,u=.1;h<15&&Math.abs(u)>1e-7;h++)i=s*Math.sin(a),i=Math.pow((1-i)/(1+i),s/2),a+=u=Math.PI/2-2*Math.atan(r*i)-a;return new M(a*e,t.x*e/n)}},je=(Object.freeze||Object)({LonLat:De,Mercator:Ne,SphericalMercator:di}),We=i({},_i,{code:"EPSG:3395",projection:Ne,transformation:function(){var t=.5/(Math.PI*Ne.R);return S(t,.5,-t,.5)}()}),He=i({},_i,{code:"EPSG:4326",projection:De,transformation:S(1/180,1,-1/180,.5)}),Fe=i({},ci,{projection:De,transformation:S(1,0,-1,0),scale:function(t){return Math.pow(2,t)},zoom:function(t){return Math.log(t)/Math.LN2},distance:function(t,i){var e=i.lng-t.lng,n=i.lat-t.lat;return Math.sqrt(e*e+n*n)},infinite:!0});ci.Earth=_i,ci.EPSG3395=We,ci.EPSG3857=vi,ci.EPSG900913=yi,ci.EPSG4326=He,ci.Simple=Fe;var Ue=ui.extend({options:{pane:"overlayPane",attribution:null,bubblingMouseEvents:!0},addTo:function(t){return t.addLayer(this),this},remove:function(){return this.removeFrom(this._map||this._mapToAdd)},removeFrom:function(t){return t&&t.removeLayer(this),this},getPane:function(t){return this._map.getPane(t?this.options[t]||t:this.options.pane)},addInteractiveTarget:function(t){return this._map._targets[n(t)]=this,this},removeInteractiveTarget:function(t){return delete this._map._targets[n(t)],this},getAttribution:function(){return this.options.attribution},_layerAdd:function(t){var i=t.target;if(i.hasLayer(this)){if(this._map=i,this._zoomAnimated=i._zoomAnimated,this.getEvents){var e=this.getEvents();i.on(e,this),this.once("remove",function(){i.off(e,this)},this)}this.onAdd(i),this.getAttribution&&i.attributionControl&&i.attributionControl.addAttribution(this.getAttribution()),this.fire("add"),i.fire("layeradd",{layer:this})}}});Le.include({addLayer:function(t){if(!t._layerAdd)throw new Error("The provided object is not a Layer.");var i=n(t);return this._layers[i]?this:(this._layers[i]=t,t._mapToAdd=this,t.beforeAdd&&t.beforeAdd(this),this.whenReady(t._layerAdd,t),this)},removeLayer:function(t){var i=n(t);return this._layers[i]?(this._loaded&&t.onRemove(this),t.getAttribution&&this.attributionControl&&this.attributionControl.removeAttribution(t.getAttribution()),delete this._layers[i],this._loaded&&(this.fire("layerremove",{layer:t}),t.fire("remove")),t._map=t._mapToAdd=null,this):this},hasLayer:function(t){return!!t&&n(t)in this._layers},eachLayer:function(t,i){for(var e in this._layers)t.call(i,this._layers[e]);return this},_addLayers:function(t){for(var i=0,e=(t=t?ei(t)?t:[t]:[]).length;i<e;i++)this.addLayer(t[i])},_addZoomLimit:function(t){!isNaN(t.options.maxZoom)&&isNaN(t.options.minZoom)||(this._zoomBoundLayers[n(t)]=t,this._updateZoomLevels())},_removeZoomLimit:function(t){var i=n(t);this._zoomBoundLayers[i]&&(delete this._zoomBoundLayers[i],this._updateZoomLevels())},_updateZoomLevels:function(){var t=1/0,i=-1/0,e=this._getZoomSpan();for(var n in this._zoomBoundLayers){var o=this._zoomBoundLayers[n].options;t=void 0===o.minZoom?t:Math.min(t,o.minZoom),i=void 0===o.maxZoom?i:Math.max(i,o.maxZoom)}this._layersMaxZoom=i===-1/0?void 0:i,this._layersMinZoom=t===1/0?void 0:t,e!==this._getZoomSpan()&&this.fire("zoomlevelschange"),void 0===this.options.maxZoom&&this._layersMaxZoom&&this.getZoom()>this._layersMaxZoom&&this.setZoom(this._layersMaxZoom),void 0===this.options.minZoom&&this._layersMinZoom&&this.getZoom()<this._layersMinZoom&&this.setZoom(this._layersMinZoom)}});var Ve=Ue.extend({initialize:function(t,i){l(this,i),this._layers={};var e,n;if(t)for(e=0,n=t.length;e<n;e++)this.addLayer(t[e])},addLayer:function(t){var i=this.getLayerId(t);return this._layers[i]=t,this._map&&this._map.addLayer(t),this},removeLayer:function(t){var i=t in this._layers?t:this.getLayerId(t);return this._map&&this._layers[i]&&this._map.removeLayer(this._layers[i]),delete this._layers[i],this},hasLayer:function(t){return!!t&&(t in this._layers||this.getLayerId(t)in this._layers)},clearLayers:function(){return this.eachLayer(this.removeLayer,this)},invoke:function(t){var i,e,n=Array.prototype.slice.call(arguments,1);for(i in this._layers)(e=this._layers[i])[t]&&e[t].apply(e,n);return this},onAdd:function(t){this.eachLayer(t.addLayer,t)},onRemove:function(t){this.eachLayer(t.removeLayer,t)},eachLayer:function(t,i){for(var e in this._layers)t.call(i,this._layers[e]);return this},getLayer:function(t){return this._layers[t]},getLayers:function(){var t=[];return this.eachLayer(t.push,t),t},setZIndex:function(t){return this.invoke("setZIndex",t)},getLayerId:function(t){return n(t)}}),qe=Ve.extend({addLayer:function(t){return this.hasLayer(t)?this:(t.addEventParent(this),Ve.prototype.addLayer.call(this,t),this.fire("layeradd",{layer:t}))},removeLayer:function(t){return this.hasLayer(t)?(t in this._layers&&(t=this._layers[t]),t.removeEventParent(this),Ve.prototype.removeLayer.call(this,t),this.fire("layerremove",{layer:t})):this},setStyle:function(t){return this.invoke("setStyle",t)},bringToFront:function(){return this.invoke("bringToFront")},bringToBack:function(){return this.invoke("bringToBack")},getBounds:function(){var t=new T;for(var i in this._layers){var e=this._layers[i];t.extend(e.getBounds?e.getBounds():e.getLatLng())}return t}}),Ge=v.extend({options:{popupAnchor:[0,0],tooltipAnchor:[0,0]},initialize:function(t){l(this,t)},createIcon:function(t){return this._createIcon("icon",t)},createShadow:function(t){return this._createIcon("shadow",t)},_createIcon:function(t,i){var e=this._getIconUrl(t);if(!e){if("icon"===t)throw new Error("iconUrl not set in Icon options (see the docs).");return null}var n=this._createImg(e,i&&"IMG"===i.tagName?i:null);return this._setIconStyles(n,t),n},_setIconStyles:function(t,i){var e=this.options,n=e[i+"Size"];"number"==typeof n&&(n=[n,n]);var o=w(n),s=w("shadow"===i&&e.shadowAnchor||e.iconAnchor||o&&o.divideBy(2,!0));t.className="leaflet-marker-"+i+" "+(e.className||""),s&&(t.style.marginLeft=-s.x+"px",t.style.marginTop=-s.y+"px"),o&&(t.style.width=o.x+"px",t.style.height=o.y+"px")},_createImg:function(t,i){return i=i||document.createElement("img"),i.src=t,i},_getIconUrl:function(t){return Ki&&this.options[t+"RetinaUrl"]||this.options[t+"Url"]}}),Ke=Ge.extend({options:{iconUrl:"marker-icon.png",iconRetinaUrl:"marker-icon-2x.png",shadowUrl:"marker-shadow.png",iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],tooltipAnchor:[16,-28],shadowSize:[41,41]},_getIconUrl:function(t){return Ke.imagePath||(Ke.imagePath=this._detectIconPath()),(this.options.imagePath||Ke.imagePath)+Ge.prototype._getIconUrl.call(this,t)},_detectIconPath:function(){var t=ht("div","leaflet-default-icon-path",document.body),i=at(t,"background-image")||at(t,"backgroundImage");return document.body.removeChild(t),i=null===i||0!==i.indexOf("url")?"":i.replace(/^url\(["']?/,"").replace(/marker-icon\.png["']?\)$/,"")}}),Ye=Ze.extend({initialize:function(t){this._marker=t},addHooks:function(){var t=this._marker._icon;this._draggable||(this._draggable=new Be(t,t,!0)),this._draggable.on({dragstart:this._onDragStart,predrag:this._onPreDrag,drag:this._onDrag,dragend:this._onDragEnd},this).enable(),pt(t,"leaflet-marker-draggable")},removeHooks:function(){this._draggable.off({dragstart:this._onDragStart,predrag:this._onPreDrag,drag:this._onDrag,dragend:this._onDragEnd},this).disable(),this._marker._icon&&mt(this._marker._icon,"leaflet-marker-draggable")},moved:function(){return this._draggable&&this._draggable._moved},_adjustPan:function(t){var i=this._marker,e=i._map,n=this._marker.options.autoPanSpeed,o=this._marker.options.autoPanPadding,s=L.DomUtil.getPosition(i._icon),r=e.getPixelBounds(),a=e.getPixelOrigin(),h=b(r.min._subtract(a).add(o),r.max._subtract(a).subtract(o));if(!h.contains(s)){var u=w((Math.max(h.max.x,s.x)-h.max.x)/(r.max.x-h.max.x)-(Math.min(h.min.x,s.x)-h.min.x)/(r.min.x-h.min.x),(Math.max(h.max.y,s.y)-h.max.y)/(r.max.y-h.max.y)-(Math.min(h.min.y,s.y)-h.min.y)/(r.min.y-h.min.y)).multiplyBy(n);e.panBy(u,{animate:!1}),this._draggable._newPos._add(u),this._draggable._startPos._add(u),L.DomUtil.setPosition(i._icon,this._draggable._newPos),this._onDrag(t),this._panRequest=f(this._adjustPan.bind(this,t))}},_onDragStart:function(){this._oldLatLng=this._marker.getLatLng(),this._marker.closePopup().fire("movestart").fire("dragstart")},_onPreDrag:function(t){this._marker.options.autoPan&&(g(this._panRequest),this._panRequest=f(this._adjustPan.bind(this,t)))},_onDrag:function(t){var i=this._marker,e=i._shadow,n=Pt(i._icon),o=i._map.layerPointToLatLng(n);e&&Lt(e,n),i._latlng=o,t.latlng=o,t.oldLatLng=this._oldLatLng,i.fire("move",t).fire("drag",t)},_onDragEnd:function(t){g(this._panRequest),delete this._oldLatLng,this._marker.fire("moveend").fire("dragend",t)}}),Xe=Ue.extend({options:{icon:new Ke,interactive:!0,draggable:!1,autoPan:!1,autoPanPadding:[50,50],autoPanSpeed:10,keyboard:!0,title:"",alt:"",zIndexOffset:0,opacity:1,riseOnHover:!1,riseOffset:250,pane:"markerPane",bubblingMouseEvents:!1},initialize:function(t,i){l(this,i),this._latlng=C(t)},onAdd:function(t){this._zoomAnimated=this._zoomAnimated&&t.options.markerZoomAnimation,this._zoomAnimated&&t.on("zoomanim",this._animateZoom,this),this._initIcon(),this.update()},onRemove:function(t){this.dragging&&this.dragging.enabled()&&(this.options.draggable=!0,this.dragging.removeHooks()),delete this.dragging,this._zoomAnimated&&t.off("zoomanim",this._animateZoom,this),this._removeIcon(),this._removeShadow()},getEvents:function(){return{zoom:this.update,viewreset:this.update}},getLatLng:function(){return this._latlng},setLatLng:function(t){var i=this._latlng;return this._latlng=C(t),this.update(),this.fire("move",{oldLatLng:i,latlng:this._latlng})},setZIndexOffset:function(t){return this.options.zIndexOffset=t,this.update()},setIcon:function(t){return this.options.icon=t,this._map&&(this._initIcon(),this.update()),this._popup&&this.bindPopup(this._popup,this._popup.options),this},getElement:function(){return this._icon},update:function(){if(this._icon&&this._map){var t=this._map.latLngToLayerPoint(this._latlng).round();this._setPos(t)}return this},_initIcon:function(){var t=this.options,i="leaflet-zoom-"+(this._zoomAnimated?"animated":"hide"),e=t.icon.createIcon(this._icon),n=!1;e!==this._icon&&(this._icon&&this._removeIcon(),n=!0,t.title&&(e.title=t.title),"IMG"===e.tagName&&(e.alt=t.alt||"")),pt(e,i),t.keyboard&&(e.tabIndex="0"),this._icon=e,t.riseOnHover&&this.on({mouseover:this._bringToFront,mouseout:this._resetZIndex});var o=t.icon.createShadow(this._shadow),s=!1;o!==this._shadow&&(this._removeShadow(),s=!0),o&&(pt(o,i),o.alt=""),this._shadow=o,t.opacity<1&&this._updateOpacity(),n&&this.getPane().appendChild(this._icon),this._initInteraction(),o&&s&&this.getPane("shadowPane").appendChild(this._shadow)},_removeIcon:function(){this.options.riseOnHover&&this.off({mouseover:this._bringToFront,mouseout:this._resetZIndex}),ut(this._icon),this.removeInteractiveTarget(this._icon),this._icon=null},_removeShadow:function(){this._shadow&&ut(this._shadow),this._shadow=null},_setPos:function(t){Lt(this._icon,t),this._shadow&&Lt(this._shadow,t),this._zIndex=t.y+this.options.zIndexOffset,this._resetZIndex()},_updateZIndex:function(t){this._icon.style.zIndex=this._zIndex+t},_animateZoom:function(t){var i=this._map._latLngToNewLayerPoint(this._latlng,t.zoom,t.center).round();this._setPos(i)},_initInteraction:function(){if(this.options.interactive&&(pt(this._icon,"leaflet-interactive"),this.addInteractiveTarget(this._icon),Ye)){var t=this.options.draggable;this.dragging&&(t=this.dragging.enabled(),this.dragging.disable()),this.dragging=new Ye(this),t&&this.dragging.enable()}},setOpacity:function(t){return this.options.opacity=t,this._map&&this._updateOpacity(),this},_updateOpacity:function(){var t=this.options.opacity;vt(this._icon,t),this._shadow&&vt(this._shadow,t)},_bringToFront:function(){this._updateZIndex(this.options.riseOffset)},_resetZIndex:function(){this._updateZIndex(0)},_getPopupAnchor:function(){return this.options.icon.options.popupAnchor},_getTooltipAnchor:function(){return this.options.icon.options.tooltipAnchor}}),Je=Ue.extend({options:{stroke:!0,color:"#3388ff",weight:3,opacity:1,lineCap:"round",lineJoin:"round",dashArray:null,dashOffset:null,fill:!1,fillColor:null,fillOpacity:.2,fillRule:"evenodd",interactive:!0,bubblingMouseEvents:!0},beforeAdd:function(t){this._renderer=t.getRenderer(this)},onAdd:function(){this._renderer._initPath(this),this._reset(),this._renderer._addPath(this)},onRemove:function(){this._renderer._removePath(this)},redraw:function(){return this._map&&this._renderer._updatePath(this),this},setStyle:function(t){return l(this,t),this._renderer&&this._renderer._updateStyle(this),this},bringToFront:function(){return this._renderer&&this._renderer._bringToFront(this),this},bringToBack:function(){return this._renderer&&this._renderer._bringToBack(this),this},getElement:function(){return this._path},_reset:function(){this._project(),this._update()},_clickTolerance:function(){return(this.options.stroke?this.options.weight/2:0)+this._renderer.options.tolerance}}),$e=Je.extend({options:{fill:!0,radius:10},initialize:function(t,i){l(this,i),this._latlng=C(t),this._radius=this.options.radius},setLatLng:function(t){return this._latlng=C(t),this.redraw(),this.fire("move",{latlng:this._latlng})},getLatLng:function(){return this._latlng},setRadius:function(t){return this.options.radius=this._radius=t,this.redraw()},getRadius:function(){return this._radius},setStyle:function(t){var i=t&&t.radius||this._radius;return Je.prototype.setStyle.call(this,t),this.setRadius(i),this},_project:function(){this._point=this._map.latLngToLayerPoint(this._latlng),this._updateBounds()},_updateBounds:function(){var t=this._radius,i=this._radiusY||t,e=this._clickTolerance(),n=[t+e,i+e];this._pxBounds=new P(this._point.subtract(n),this._point.add(n))},_update:function(){this._map&&this._updatePath()},_updatePath:function(){this._renderer._updateCircle(this)},_empty:function(){return this._radius&&!this._renderer._bounds.intersects(this._pxBounds)},_containsPoint:function(t){return t.distanceTo(this._point)<=this._radius+this._clickTolerance()}}),Qe=$e.extend({initialize:function(t,e,n){if("number"==typeof e&&(e=i({},n,{radius:e})),l(this,e),this._latlng=C(t),isNaN(this.options.radius))throw new Error("Circle radius cannot be NaN");this._mRadius=this.options.radius},setRadius:function(t){return this._mRadius=t,this.redraw()},getRadius:function(){return this._mRadius},getBounds:function(){var t=[this._radius,this._radiusY||this._radius];return new T(this._map.layerPointToLatLng(this._point.subtract(t)),this._map.layerPointToLatLng(this._point.add(t)))},setStyle:Je.prototype.setStyle,_project:function(){var t=this._latlng.lng,i=this._latlng.lat,e=this._map,n=e.options.crs;if(n.distance===_i.distance){var o=Math.PI/180,s=this._mRadius/_i.R/o,r=e.project([i+s,t]),a=e.project([i-s,t]),h=r.add(a).divideBy(2),u=e.unproject(h).lat,l=Math.acos((Math.cos(s*o)-Math.sin(i*o)*Math.sin(u*o))/(Math.cos(i*o)*Math.cos(u*o)))/o;(isNaN(l)||0===l)&&(l=s/Math.cos(Math.PI/180*i)),this._point=h.subtract(e.getPixelOrigin()),this._radius=isNaN(l)?0:h.x-e.project([u,t-l]).x,this._radiusY=h.y-r.y}else{var c=n.unproject(n.project(this._latlng).subtract([this._mRadius,0]));this._point=e.latLngToLayerPoint(this._latlng),this._radius=this._point.x-e.latLngToLayerPoint(c).x}this._updateBounds()}}),tn=Je.extend({options:{smoothFactor:1,noClip:!1},initialize:function(t,i){l(this,i),this._setLatLngs(t)},getLatLngs:function(){return this._latlngs},setLatLngs:function(t){return this._setLatLngs(t),this.redraw()},isEmpty:function(){return!this._latlngs.length},closestLayerPoint:function(t){for(var i,e,n=1/0,o=null,s=Rt,r=0,a=this._parts.length;r<a;r++)for(var h=this._parts[r],u=1,l=h.length;u<l;u++){var c=s(t,i=h[u-1],e=h[u],!0);c<n&&(n=c,o=s(t,i,e))}return o&&(o.distance=Math.sqrt(n)),o},getCenter:function(){if(!this._map)throw new Error("Must add layer to map before using getCenter()");var t,i,e,n,o,s,r,a=this._rings[0],h=a.length;if(!h)return null;for(t=0,i=0;t<h-1;t++)i+=a[t].distanceTo(a[t+1])/2;if(0===i)return this._map.layerPointToLatLng(a[0]);for(t=0,n=0;t<h-1;t++)if(o=a[t],s=a[t+1],e=o.distanceTo(s),(n+=e)>i)return r=(n-i)/e,this._map.layerPointToLatLng([s.x-r*(s.x-o.x),s.y-r*(s.y-o.y)])},getBounds:function(){return this._bounds},addLatLng:function(t,i){return i=i||this._defaultShape(),t=C(t),i.push(t),this._bounds.extend(t),this.redraw()},_setLatLngs:function(t){this._bounds=new T,this._latlngs=this._convertLatLngs(t)},_defaultShape:function(){return Dt(this._latlngs)?this._latlngs:this._latlngs[0]},_convertLatLngs:function(t){for(var i=[],e=Dt(t),n=0,o=t.length;n<o;n++)e?(i[n]=C(t[n]),this._bounds.extend(i[n])):i[n]=this._convertLatLngs(t[n]);return i},_project:function(){var t=new P;this._rings=[],this._projectLatlngs(this._latlngs,this._rings,t);var i=this._clickTolerance(),e=new x(i,i);this._bounds.isValid()&&t.isValid()&&(t.min._subtract(e),t.max._add(e),this._pxBounds=t)},_projectLatlngs:function(t,i,e){var n,o,s=t[0]instanceof M,r=t.length;if(s){for(o=[],n=0;n<r;n++)o[n]=this._map.latLngToLayerPoint(t[n]),e.extend(o[n]);i.push(o)}else for(n=0;n<r;n++)this._projectLatlngs(t[n],i,e)},_clipPoints:function(){var t=this._renderer._bounds;if(this._parts=[],this._pxBounds&&this._pxBounds.intersects(t))if(this.options.noClip)this._parts=this._rings;else{var i,e,n,o,s,r,a,h=this._parts;for(i=0,n=0,o=this._rings.length;i<o;i++)for(e=0,s=(a=this._rings[i]).length;e<s-1;e++)(r=It(a[e],a[e+1],t,e,!0))&&(h[n]=h[n]||[],h[n].push(r[0]),r[1]===a[e+1]&&e!==s-2||(h[n].push(r[1]),n++))}},_simplifyPoints:function(){for(var t=this._parts,i=this.options.smoothFactor,e=0,n=t.length;e<n;e++)t[e]=Ct(t[e],i)},_update:function(){this._map&&(this._clipPoints(),this._simplifyPoints(),this._updatePath())},_updatePath:function(){this._renderer._updatePoly(this)},_containsPoint:function(t,i){var e,n,o,s,r,a,h=this._clickTolerance();if(!this._pxBounds||!this._pxBounds.contains(t))return!1;for(e=0,s=this._parts.length;e<s;e++)for(n=0,o=(r=(a=this._parts[e]).length)-1;n<r;o=n++)if((i||0!==n)&&Zt(t,a[o],a[n])<=h)return!0;return!1}});tn._flat=Nt;var en=tn.extend({options:{fill:!0},isEmpty:function(){return!this._latlngs.length||!this._latlngs[0].length},getCenter:function(){if(!this._map)throw new Error("Must add layer to map before using getCenter()");var t,i,e,n,o,s,r,a,h,u=this._rings[0],l=u.length;if(!l)return null;for(s=r=a=0,t=0,i=l-1;t<l;i=t++)e=u[t],n=u[i],o=e.y*n.x-n.y*e.x,r+=(e.x+n.x)*o,a+=(e.y+n.y)*o,s+=3*o;return h=0===s?u[0]:[r/s,a/s],this._map.layerPointToLatLng(h)},_convertLatLngs:function(t){var i=tn.prototype._convertLatLngs.call(this,t),e=i.length;return e>=2&&i[0]instanceof M&&i[0].equals(i[e-1])&&i.pop(),i},_setLatLngs:function(t){tn.prototype._setLatLngs.call(this,t),Dt(this._latlngs)&&(this._latlngs=[this._latlngs])},_defaultShape:function(){return Dt(this._latlngs[0])?this._latlngs[0]:this._latlngs[0][0]},_clipPoints:function(){var t=this._renderer._bounds,i=this.options.weight,e=new x(i,i);if(t=new P(t.min.subtract(e),t.max.add(e)),this._parts=[],this._pxBounds&&this._pxBounds.intersects(t))if(this.options.noClip)this._parts=this._rings;else for(var n,o=0,s=this._rings.length;o<s;o++)(n=jt(this._rings[o],t,!0)).length&&this._parts.push(n)},_updatePath:function(){this._renderer._updatePoly(this,!0)},_containsPoint:function(t){var i,e,n,o,s,r,a,h,u=!1;if(!this._pxBounds.contains(t))return!1;for(o=0,a=this._parts.length;o<a;o++)for(s=0,r=(h=(i=this._parts[o]).length)-1;s<h;r=s++)e=i[s],n=i[r],e.y>t.y!=n.y>t.y&&t.x<(n.x-e.x)*(t.y-e.y)/(n.y-e.y)+e.x&&(u=!u);return u||tn.prototype._containsPoint.call(this,t,!0)}}),nn=qe.extend({initialize:function(t,i){l(this,i),this._layers={},t&&this.addData(t)},addData:function(t){var i,e,n,o=ei(t)?t:t.features;if(o){for(i=0,e=o.length;i<e;i++)((n=o[i]).geometries||n.geometry||n.features||n.coordinates)&&this.addData(n);return this}var s=this.options;if(s.filter&&!s.filter(t))return this;var r=Wt(t,s);return r?(r.feature=Gt(t),r.defaultOptions=r.options,this.resetStyle(r),s.onEachFeature&&s.onEachFeature(t,r),this.addLayer(r)):this},resetStyle:function(t){return t.options=i({},t.defaultOptions),this._setLayerStyle(t,this.options.style),this},setStyle:function(t){return this.eachLayer(function(i){this._setLayerStyle(i,t)},this)},_setLayerStyle:function(t,i){"function"==typeof i&&(i=i(t.feature)),t.setStyle&&t.setStyle(i)}}),on={toGeoJSON:function(t){return qt(this,{type:"Point",coordinates:Ut(this.getLatLng(),t)})}};Xe.include(on),Qe.include(on),$e.include(on),tn.include({toGeoJSON:function(t){var i=!Dt(this._latlngs),e=Vt(this._latlngs,i?1:0,!1,t);return qt(this,{type:(i?"Multi":"")+"LineString",coordinates:e})}}),en.include({toGeoJSON:function(t){var i=!Dt(this._latlngs),e=i&&!Dt(this._latlngs[0]),n=Vt(this._latlngs,e?2:i?1:0,!0,t);return i||(n=[n]),qt(this,{type:(e?"Multi":"")+"Polygon",coordinates:n})}}),Ve.include({toMultiPoint:function(t){var i=[];return this.eachLayer(function(e){i.push(e.toGeoJSON(t).geometry.coordinates)}),qt(this,{type:"MultiPoint",coordinates:i})},toGeoJSON:function(t){var i=this.feature&&this.feature.geometry&&this.feature.geometry.type;if("MultiPoint"===i)return this.toMultiPoint(t);var e="GeometryCollection"===i,n=[];return this.eachLayer(function(i){if(i.toGeoJSON){var o=i.toGeoJSON(t);if(e)n.push(o.geometry);else{var s=Gt(o);"FeatureCollection"===s.type?n.push.apply(n,s.features):n.push(s)}}}),e?qt(this,{geometries:n,type:"GeometryCollection"}):{type:"FeatureCollection",features:n}}});var sn=Kt,rn=Ue.extend({options:{opacity:1,alt:"",interactive:!1,crossOrigin:!1,errorOverlayUrl:"",zIndex:1,className:""},initialize:function(t,i,e){this._url=t,this._bounds=z(i),l(this,e)},onAdd:function(){this._image||(this._initImage(),this.options.opacity<1&&this._updateOpacity()),this.options.interactive&&(pt(this._image,"leaflet-interactive"),this.addInteractiveTarget(this._image)),this.getPane().appendChild(this._image),this._reset()},onRemove:function(){ut(this._image),this.options.interactive&&this.removeInteractiveTarget(this._image)},setOpacity:function(t){return this.options.opacity=t,this._image&&this._updateOpacity(),this},setStyle:function(t){return t.opacity&&this.setOpacity(t.opacity),this},bringToFront:function(){return this._map&&ct(this._image),this},bringToBack:function(){return this._map&&_t(this._image),this},setUrl:function(t){return this._url=t,this._image&&(this._image.src=t),this},setBounds:function(t){return this._bounds=z(t),this._map&&this._reset(),this},getEvents:function(){var t={zoom:this._reset,viewreset:this._reset};return this._zoomAnimated&&(t.zoomanim=this._animateZoom),t},setZIndex:function(t){return this.options.zIndex=t,this._updateZIndex(),this},getBounds:function(){return this._bounds},getElement:function(){return this._image},_initImage:function(){var t="IMG"===this._url.tagName,i=this._image=t?this._url:ht("img");pt(i,"leaflet-image-layer"),this._zoomAnimated&&pt(i,"leaflet-zoom-animated"),this.options.className&&pt(i,this.options.className),i.onselectstart=r,i.onmousemove=r,i.onload=e(this.fire,this,"load"),i.onerror=e(this._overlayOnError,this,"error"),this.options.crossOrigin&&(i.crossOrigin=""),this.options.zIndex&&this._updateZIndex(),t?this._url=i.src:(i.src=this._url,i.alt=this.options.alt)},_animateZoom:function(t){var i=this._map.getZoomScale(t.zoom),e=this._map._latLngBoundsToNewLayerBounds(this._bounds,t.zoom,t.center).min;wt(this._image,e,i)},_reset:function(){var t=this._image,i=new P(this._map.latLngToLayerPoint(this._bounds.getNorthWest()),this._map.latLngToLayerPoint(this._bounds.getSouthEast())),e=i.getSize();Lt(t,i.min),t.style.width=e.x+"px",t.style.height=e.y+"px"},_updateOpacity:function(){vt(this._image,this.options.opacity)},_updateZIndex:function(){this._image&&void 0!==this.options.zIndex&&null!==this.options.zIndex&&(this._image.style.zIndex=this.options.zIndex)},_overlayOnError:function(){this.fire("error");var t=this.options.errorOverlayUrl;t&&this._url!==t&&(this._url=t,this._image.src=t)}}),an=rn.extend({options:{autoplay:!0,loop:!0},_initImage:function(){var t="VIDEO"===this._url.tagName,i=this._image=t?this._url:ht("video");if(pt(i,"leaflet-image-layer"),this._zoomAnimated&&pt(i,"leaflet-zoom-animated"),i.onselectstart=r,i.onmousemove=r,i.onloadeddata=e(this.fire,this,"load"),t){for(var n=i.getElementsByTagName("source"),o=[],s=0;s<n.length;s++)o.push(n[s].src);this._url=n.length>0?o:[i.src]}else{ei(this._url)||(this._url=[this._url]),i.autoplay=!!this.options.autoplay,i.loop=!!this.options.loop;for(var a=0;a<this._url.length;a++){var h=ht("source");h.src=this._url[a],i.appendChild(h)}}}}),hn=Ue.extend({options:{offset:[0,7],className:"",pane:"popupPane"},initialize:function(t,i){l(this,t),this._source=i},onAdd:function(t){this._zoomAnimated=t._zoomAnimated,this._container||this._initLayout(),t._fadeAnimated&&vt(this._container,0),clearTimeout(this._removeTimeout),this.getPane().appendChild(this._container),this.update(),t._fadeAnimated&&vt(this._container,1),this.bringToFront()},onRemove:function(t){t._fadeAnimated?(vt(this._container,0),this._removeTimeout=setTimeout(e(ut,void 0,this._container),200)):ut(this._container)},getLatLng:function(){return this._latlng},setLatLng:function(t){return this._latlng=C(t),this._map&&(this._updatePosition(),this._adjustPan()),this},getContent:function(){return this._content},setContent:function(t){return this._content=t,this.update(),this},getElement:function(){return this._container},update:function(){this._map&&(this._container.style.visibility="hidden",this._updateContent(),this._updateLayout(),this._updatePosition(),this._container.style.visibility="",this._adjustPan())},getEvents:function(){var t={zoom:this._updatePosition,viewreset:this._updatePosition};return this._zoomAnimated&&(t.zoomanim=this._animateZoom),t},isOpen:function(){return!!this._map&&this._map.hasLayer(this)},bringToFront:function(){return this._map&&ct(this._container),this},bringToBack:function(){return this._map&&_t(this._container),this},_updateContent:function(){if(this._content){var t=this._contentNode,i="function"==typeof this._content?this._content(this._source||this):this._content;if("string"==typeof i)t.innerHTML=i;else{for(;t.hasChildNodes();)t.removeChild(t.firstChild);t.appendChild(i)}this.fire("contentupdate")}},_updatePosition:function(){if(this._map){var t=this._map.latLngToLayerPoint(this._latlng),i=w(this.options.offset),e=this._getAnchor();this._zoomAnimated?Lt(this._container,t.add(e)):i=i.add(t).add(e);var n=this._containerBottom=-i.y,o=this._containerLeft=-Math.round(this._containerWidth/2)+i.x;this._container.style.bottom=n+"px",this._container.style.left=o+"px"}},_getAnchor:function(){return[0,0]}}),un=hn.extend({options:{maxWidth:300,minWidth:50,maxHeight:null,autoPan:!0,autoPanPaddingTopLeft:null,autoPanPaddingBottomRight:null,autoPanPadding:[5,5],keepInView:!1,closeButton:!0,autoClose:!0,closeOnEscapeKey:!0,className:""},openOn:function(t){return t.openPopup(this),this},onAdd:function(t){hn.prototype.onAdd.call(this,t),t.fire("popupopen",{popup:this}),this._source&&(this._source.fire("popupopen",{popup:this},!0),this._source instanceof Je||this._source.on("preclick",Y))},onRemove:function(t){hn.prototype.onRemove.call(this,t),t.fire("popupclose",{popup:this}),this._source&&(this._source.fire("popupclose",{popup:this},!0),this._source instanceof Je||this._source.off("preclick",Y))},getEvents:function(){var t=hn.prototype.getEvents.call(this);return(void 0!==this.options.closeOnClick?this.options.closeOnClick:this._map.options.closePopupOnClick)&&(t.preclick=this._close),this.options.keepInView&&(t.moveend=this._adjustPan),t},_close:function(){this._map&&this._map.closePopup(this)},_initLayout:function(){var t="leaflet-popup",i=this._container=ht("div",t+" "+(this.options.className||"")+" leaflet-zoom-animated"),e=this._wrapper=ht("div",t+"-content-wrapper",i);if(this._contentNode=ht("div",t+"-content",e),J(e),X(this._contentNode),V(e,"contextmenu",Y),this._tipContainer=ht("div",t+"-tip-container",i),this._tip=ht("div",t+"-tip",this._tipContainer),this.options.closeButton){var n=this._closeButton=ht("a",t+"-close-button",i);n.href="#close",n.innerHTML="&#215;",V(n,"click",this._onCloseButtonClick,this)}},_updateLayout:function(){var t=this._contentNode,i=t.style;i.width="",i.whiteSpace="nowrap";var e=t.offsetWidth;e=Math.min(e,this.options.maxWidth),e=Math.max(e,this.options.minWidth),i.width=e+1+"px",i.whiteSpace="",i.height="";var n=t.offsetHeight,o=this.options.maxHeight;o&&n>o?(i.height=o+"px",pt(t,"leaflet-popup-scrolled")):mt(t,"leaflet-popup-scrolled"),this._containerWidth=this._container.offsetWidth},_animateZoom:function(t){var i=this._map._latLngToNewLayerPoint(this._latlng,t.zoom,t.center),e=this._getAnchor();Lt(this._container,i.add(e))},_adjustPan:function(){if(!(!this.options.autoPan||this._map._panAnim&&this._map._panAnim._inProgress)){var t=this._map,i=parseInt(at(this._container,"marginBottom"),10)||0,e=this._container.offsetHeight+i,n=this._containerWidth,o=new x(this._containerLeft,-e-this._containerBottom);o._add(Pt(this._container));var s=t.layerPointToContainerPoint(o),r=w(this.options.autoPanPadding),a=w(this.options.autoPanPaddingTopLeft||r),h=w(this.options.autoPanPaddingBottomRight||r),u=t.getSize(),l=0,c=0;s.x+n+h.x>u.x&&(l=s.x+n-u.x+h.x),s.x-l-a.x<0&&(l=s.x-a.x),s.y+e+h.y>u.y&&(c=s.y+e-u.y+h.y),s.y-c-a.y<0&&(c=s.y-a.y),(l||c)&&t.fire("autopanstart").panBy([l,c])}},_onCloseButtonClick:function(t){this._close(),Q(t)},_getAnchor:function(){return w(this._source&&this._source._getPopupAnchor?this._source._getPopupAnchor():[0,0])}});Le.mergeOptions({closePopupOnClick:!0}),Le.include({openPopup:function(t,i,e){return t instanceof un||(t=new un(e).setContent(t)),i&&t.setLatLng(i),this.hasLayer(t)?this:(this._popup&&this._popup.options.autoClose&&this.closePopup(),this._popup=t,this.addLayer(t))},closePopup:function(t){return t&&t!==this._popup||(t=this._popup,this._popup=null),t&&this.removeLayer(t),this}}),Ue.include({bindPopup:function(t,i){return t instanceof un?(l(t,i),this._popup=t,t._source=this):(this._popup&&!i||(this._popup=new un(i,this)),this._popup.setContent(t)),this._popupHandlersAdded||(this.on({click:this._openPopup,keypress:this._onKeyPress,remove:this.closePopup,move:this._movePopup}),this._popupHandlersAdded=!0),this},unbindPopup:function(){return this._popup&&(this.off({click:this._openPopup,keypress:this._onKeyPress,remove:this.closePopup,move:this._movePopup}),this._popupHandlersAdded=!1,this._popup=null),this},openPopup:function(t,i){if(t instanceof Ue||(i=t,t=this),t instanceof qe)for(var e in this._layers){t=this._layers[e];break}return i||(i=t.getCenter?t.getCenter():t.getLatLng()),this._popup&&this._map&&(this._popup._source=t,this._popup.update(),this._map.openPopup(this._popup,i)),this},closePopup:function(){return this._popup&&this._popup._close(),this},togglePopup:function(t){return this._popup&&(this._popup._map?this.closePopup():this.openPopup(t)),this},isPopupOpen:function(){return!!this._popup&&this._popup.isOpen()},setPopupContent:function(t){return this._popup&&this._popup.setContent(t),this},getPopup:function(){return this._popup},_openPopup:function(t){var i=t.layer||t.target;this._popup&&this._map&&(Q(t),i instanceof Je?this.openPopup(t.layer||t.target,t.latlng):this._map.hasLayer(this._popup)&&this._popup._source===i?this.closePopup():this.openPopup(i,t.latlng))},_movePopup:function(t){this._popup.setLatLng(t.latlng)},_onKeyPress:function(t){13===t.originalEvent.keyCode&&this._openPopup(t)}});var ln=hn.extend({options:{pane:"tooltipPane",offset:[0,0],direction:"auto",permanent:!1,sticky:!1,interactive:!1,opacity:.9},onAdd:function(t){hn.prototype.onAdd.call(this,t),this.setOpacity(this.options.opacity),t.fire("tooltipopen",{tooltip:this}),this._source&&this._source.fire("tooltipopen",{tooltip:this},!0)},onRemove:function(t){hn.prototype.onRemove.call(this,t),t.fire("tooltipclose",{tooltip:this}),this._source&&this._source.fire("tooltipclose",{tooltip:this},!0)},getEvents:function(){var t=hn.prototype.getEvents.call(this);return Vi&&!this.options.permanent&&(t.preclick=this._close),t},_close:function(){this._map&&this._map.closeTooltip(this)},_initLayout:function(){var t="leaflet-tooltip "+(this.options.className||"")+" leaflet-zoom-"+(this._zoomAnimated?"animated":"hide");this._contentNode=this._container=ht("div",t)},_updateLayout:function(){},_adjustPan:function(){},_setPosition:function(t){var i=this._map,e=this._container,n=i.latLngToContainerPoint(i.getCenter()),o=i.layerPointToContainerPoint(t),s=this.options.direction,r=e.offsetWidth,a=e.offsetHeight,h=w(this.options.offset),u=this._getAnchor();"top"===s?t=t.add(w(-r/2+h.x,-a+h.y+u.y,!0)):"bottom"===s?t=t.subtract(w(r/2-h.x,-h.y,!0)):"center"===s?t=t.subtract(w(r/2+h.x,a/2-u.y+h.y,!0)):"right"===s||"auto"===s&&o.x<n.x?(s="right",t=t.add(w(h.x+u.x,u.y-a/2+h.y,!0))):(s="left",t=t.subtract(w(r+u.x-h.x,a/2-u.y-h.y,!0))),mt(e,"leaflet-tooltip-right"),mt(e,"leaflet-tooltip-left"),mt(e,"leaflet-tooltip-top"),mt(e,"leaflet-tooltip-bottom"),pt(e,"leaflet-tooltip-"+s),Lt(e,t)},_updatePosition:function(){var t=this._map.latLngToLayerPoint(this._latlng);this._setPosition(t)},setOpacity:function(t){this.options.opacity=t,this._container&&vt(this._container,t)},_animateZoom:function(t){var i=this._map._latLngToNewLayerPoint(this._latlng,t.zoom,t.center);this._setPosition(i)},_getAnchor:function(){return w(this._source&&this._source._getTooltipAnchor&&!this.options.sticky?this._source._getTooltipAnchor():[0,0])}});Le.include({openTooltip:function(t,i,e){return t instanceof ln||(t=new ln(e).setContent(t)),i&&t.setLatLng(i),this.hasLayer(t)?this:this.addLayer(t)},closeTooltip:function(t){return t&&this.removeLayer(t),this}}),Ue.include({bindTooltip:function(t,i){return t instanceof ln?(l(t,i),this._tooltip=t,t._source=this):(this._tooltip&&!i||(this._tooltip=new ln(i,this)),this._tooltip.setContent(t)),this._initTooltipInteractions(),this._tooltip.options.permanent&&this._map&&this._map.hasLayer(this)&&this.openTooltip(),this},unbindTooltip:function(){return this._tooltip&&(this._initTooltipInteractions(!0),this.closeTooltip(),this._tooltip=null),this},_initTooltipInteractions:function(t){if(t||!this._tooltipHandlersAdded){var i=t?"off":"on",e={remove:this.closeTooltip,move:this._moveTooltip};this._tooltip.options.permanent?e.add=this._openTooltip:(e.mouseover=this._openTooltip,e.mouseout=this.closeTooltip,this._tooltip.options.sticky&&(e.mousemove=this._moveTooltip),Vi&&(e.click=this._openTooltip)),this[i](e),this._tooltipHandlersAdded=!t}},openTooltip:function(t,i){if(t instanceof Ue||(i=t,t=this),t instanceof qe)for(var e in this._layers){t=this._layers[e];break}return i||(i=t.getCenter?t.getCenter():t.getLatLng()),this._tooltip&&this._map&&(this._tooltip._source=t,this._tooltip.update(),this._map.openTooltip(this._tooltip,i),this._tooltip.options.interactive&&this._tooltip._container&&(pt(this._tooltip._container,"leaflet-clickable"),this.addInteractiveTarget(this._tooltip._container))),this},closeTooltip:function(){return this._tooltip&&(this._tooltip._close(),this._tooltip.options.interactive&&this._tooltip._container&&(mt(this._tooltip._container,"leaflet-clickable"),this.removeInteractiveTarget(this._tooltip._container))),this},toggleTooltip:function(t){return this._tooltip&&(this._tooltip._map?this.closeTooltip():this.openTooltip(t)),this},isTooltipOpen:function(){return this._tooltip.isOpen()},setTooltipContent:function(t){return this._tooltip&&this._tooltip.setContent(t),this},getTooltip:function(){return this._tooltip},_openTooltip:function(t){var i=t.layer||t.target;this._tooltip&&this._map&&this.openTooltip(i,this._tooltip.options.sticky?t.latlng:void 0)},_moveTooltip:function(t){var i,e,n=t.latlng;this._tooltip.options.sticky&&t.originalEvent&&(i=this._map.mouseEventToContainerPoint(t.originalEvent),e=this._map.containerPointToLayerPoint(i),n=this._map.layerPointToLatLng(e)),this._tooltip.setLatLng(n)}});var cn=Ge.extend({options:{iconSize:[12,12],html:!1,bgPos:null,className:"leaflet-div-icon"},createIcon:function(t){var i=t&&"DIV"===t.tagName?t:document.createElement("div"),e=this.options;if(i.innerHTML=!1!==e.html?e.html:"",e.bgPos){var n=w(e.bgPos);i.style.backgroundPosition=-n.x+"px "+-n.y+"px"}return this._setIconStyles(i,"icon"),i},createShadow:function(){return null}});Ge.Default=Ke;var _n=Ue.extend({options:{tileSize:256,opacity:1,updateWhenIdle:ji,updateWhenZooming:!0,updateInterval:200,zIndex:1,bounds:null,minZoom:0,maxZoom:void 0,maxNativeZoom:void 0,minNativeZoom:void 0,noWrap:!1,pane:"tilePane",className:"",keepBuffer:2},initialize:function(t){l(this,t)},onAdd:function(){this._initContainer(),this._levels={},this._tiles={},this._resetView(),this._update()},beforeAdd:function(t){t._addZoomLimit(this)},onRemove:function(t){this._removeAllTiles(),ut(this._container),t._removeZoomLimit(this),this._container=null,this._tileZoom=void 0},bringToFront:function(){return this._map&&(ct(this._container),this._setAutoZIndex(Math.max)),this},bringToBack:function(){return this._map&&(_t(this._container),this._setAutoZIndex(Math.min)),this},getContainer:function(){return this._container},setOpacity:function(t){return this.options.opacity=t,this._updateOpacity(),this},setZIndex:function(t){return this.options.zIndex=t,this._updateZIndex(),this},isLoading:function(){return this._loading},redraw:function(){return this._map&&(this._removeAllTiles(),this._update()),this},getEvents:function(){var t={viewprereset:this._invalidateAll,viewreset:this._resetView,zoom:this._resetView,moveend:this._onMoveEnd};return this.options.updateWhenIdle||(this._onMove||(this._onMove=o(this._onMoveEnd,this.options.updateInterval,this)),t.move=this._onMove),this._zoomAnimated&&(t.zoomanim=this._animateZoom),t},createTile:function(){return document.createElement("div")},getTileSize:function(){var t=this.options.tileSize;return t instanceof x?t:new x(t,t)},_updateZIndex:function(){this._container&&void 0!==this.options.zIndex&&null!==this.options.zIndex&&(this._container.style.zIndex=this.options.zIndex)},_setAutoZIndex:function(t){for(var i,e=this.getPane().children,n=-t(-1/0,1/0),o=0,s=e.length;o<s;o++)i=e[o].style.zIndex,e[o]!==this._container&&i&&(n=t(n,+i));isFinite(n)&&(this.options.zIndex=n+t(-1,1),this._updateZIndex())},_updateOpacity:function(){if(this._map&&!Li){vt(this._container,this.options.opacity);var t=+new Date,i=!1,e=!1;for(var n in this._tiles){var o=this._tiles[n];if(o.current&&o.loaded){var s=Math.min(1,(t-o.loaded)/200);vt(o.el,s),s<1?i=!0:(o.active?e=!0:this._onOpaqueTile(o),o.active=!0)}}e&&!this._noPrune&&this._pruneTiles(),i&&(g(this._fadeFrame),this._fadeFrame=f(this._updateOpacity,this))}},_onOpaqueTile:r,_initContainer:function(){this._container||(this._container=ht("div","leaflet-layer "+(this.options.className||"")),this._updateZIndex(),this.options.opacity<1&&this._updateOpacity(),this.getPane().appendChild(this._container))},_updateLevels:function(){var t=this._tileZoom,i=this.options.maxZoom;if(void 0!==t){for(var e in this._levels)this._levels[e].el.children.length||e===t?(this._levels[e].el.style.zIndex=i-Math.abs(t-e),this._onUpdateLevel(e)):(ut(this._levels[e].el),this._removeTilesAtZoom(e),this._onRemoveLevel(e),delete this._levels[e]);var n=this._levels[t],o=this._map;return n||((n=this._levels[t]={}).el=ht("div","leaflet-tile-container leaflet-zoom-animated",this._container),n.el.style.zIndex=i,n.origin=o.project(o.unproject(o.getPixelOrigin()),t).round(),n.zoom=t,this._setZoomTransform(n,o.getCenter(),o.getZoom()),n.el.offsetWidth,this._onCreateLevel(n)),this._level=n,n}},_onUpdateLevel:r,_onRemoveLevel:r,_onCreateLevel:r,_pruneTiles:function(){if(this._map){var t,i,e=this._map.getZoom();if(e>this.options.maxZoom||e<this.options.minZoom)this._removeAllTiles();else{for(t in this._tiles)(i=this._tiles[t]).retain=i.current;for(t in this._tiles)if((i=this._tiles[t]).current&&!i.active){var n=i.coords;this._retainParent(n.x,n.y,n.z,n.z-5)||this._retainChildren(n.x,n.y,n.z,n.z+2)}for(t in this._tiles)this._tiles[t].retain||this._removeTile(t)}}},_removeTilesAtZoom:function(t){for(var i in this._tiles)this._tiles[i].coords.z===t&&this._removeTile(i)},_removeAllTiles:function(){for(var t in this._tiles)this._removeTile(t)},_invalidateAll:function(){for(var t in this._levels)ut(this._levels[t].el),this._onRemoveLevel(t),delete this._levels[t];this._removeAllTiles(),this._tileZoom=void 0},_retainParent:function(t,i,e,n){var o=Math.floor(t/2),s=Math.floor(i/2),r=e-1,a=new x(+o,+s);a.z=+r;var h=this._tileCoordsToKey(a),u=this._tiles[h];return u&&u.active?(u.retain=!0,!0):(u&&u.loaded&&(u.retain=!0),r>n&&this._retainParent(o,s,r,n))},_retainChildren:function(t,i,e,n){for(var o=2*t;o<2*t+2;o++)for(var s=2*i;s<2*i+2;s++){var r=new x(o,s);r.z=e+1;var a=this._tileCoordsToKey(r),h=this._tiles[a];h&&h.active?h.retain=!0:(h&&h.loaded&&(h.retain=!0),e+1<n&&this._retainChildren(o,s,e+1,n))}},_resetView:function(t){var i=t&&(t.pinch||t.flyTo);this._setView(this._map.getCenter(),this._map.getZoom(),i,i)},_animateZoom:function(t){this._setView(t.center,t.zoom,!0,t.noUpdate)},_clampZoom:function(t){var i=this.options;return void 0!==i.minNativeZoom&&t<i.minNativeZoom?i.minNativeZoom:void 0!==i.maxNativeZoom&&i.maxNativeZoom<t?i.maxNativeZoom:t},_setView:function(t,i,e,n){var o=this._clampZoom(Math.round(i));(void 0!==this.options.maxZoom&&o>this.options.maxZoom||void 0!==this.options.minZoom&&o<this.options.minZoom)&&(o=void 0);var s=this.options.updateWhenZooming&&o!==this._tileZoom;n&&!s||(this._tileZoom=o,this._abortLoading&&this._abortLoading(),this._updateLevels(),this._resetGrid(),void 0!==o&&this._update(t),e||this._pruneTiles(),this._noPrune=!!e),this._setZoomTransforms(t,i)},_setZoomTransforms:function(t,i){for(var e in this._levels)this._setZoomTransform(this._levels[e],t,i)},_setZoomTransform:function(t,i,e){var n=this._map.getZoomScale(e,t.zoom),o=t.origin.multiplyBy(n).subtract(this._map._getNewPixelOrigin(i,e)).round();Ni?wt(t.el,o,n):Lt(t.el,o)},_resetGrid:function(){var t=this._map,i=t.options.crs,e=this._tileSize=this.getTileSize(),n=this._tileZoom,o=this._map.getPixelWorldBounds(this._tileZoom);o&&(this._globalTileRange=this._pxBoundsToTileRange(o)),this._wrapX=i.wrapLng&&!this.options.noWrap&&[Math.floor(t.project([0,i.wrapLng[0]],n).x/e.x),Math.ceil(t.project([0,i.wrapLng[1]],n).x/e.y)],this._wrapY=i.wrapLat&&!this.options.noWrap&&[Math.floor(t.project([i.wrapLat[0],0],n).y/e.x),Math.ceil(t.project([i.wrapLat[1],0],n).y/e.y)]},_onMoveEnd:function(){this._map&&!this._map._animatingZoom&&this._update()},_getTiledPixelBounds:function(t){var i=this._map,e=i._animatingZoom?Math.max(i._animateToZoom,i.getZoom()):i.getZoom(),n=i.getZoomScale(e,this._tileZoom),o=i.project(t,this._tileZoom).floor(),s=i.getSize().divideBy(2*n);return new P(o.subtract(s),o.add(s))},_update:function(t){var i=this._map;if(i){var e=this._clampZoom(i.getZoom());if(void 0===t&&(t=i.getCenter()),void 0!==this._tileZoom){var n=this._getTiledPixelBounds(t),o=this._pxBoundsToTileRange(n),s=o.getCenter(),r=[],a=this.options.keepBuffer,h=new P(o.getBottomLeft().subtract([a,-a]),o.getTopRight().add([a,-a]));if(!(isFinite(o.min.x)&&isFinite(o.min.y)&&isFinite(o.max.x)&&isFinite(o.max.y)))throw new Error("Attempted to load an infinite number of tiles");for(var u in this._tiles){var l=this._tiles[u].coords;l.z===this._tileZoom&&h.contains(new x(l.x,l.y))||(this._tiles[u].current=!1)}if(Math.abs(e-this._tileZoom)>1)this._setView(t,e);else{for(var c=o.min.y;c<=o.max.y;c++)for(var _=o.min.x;_<=o.max.x;_++){var d=new x(_,c);if(d.z=this._tileZoom,this._isValidTile(d)){var p=this._tiles[this._tileCoordsToKey(d)];p?p.current=!0:r.push(d)}}if(r.sort(function(t,i){return t.distanceTo(s)-i.distanceTo(s)}),0!==r.length){this._loading||(this._loading=!0,this.fire("loading"));var m=document.createDocumentFragment();for(_=0;_<r.length;_++)this._addTile(r[_],m);this._level.el.appendChild(m)}}}}},_isValidTile:function(t){var i=this._map.options.crs;if(!i.infinite){var e=this._globalTileRange;if(!i.wrapLng&&(t.x<e.min.x||t.x>e.max.x)||!i.wrapLat&&(t.y<e.min.y||t.y>e.max.y))return!1}if(!this.options.bounds)return!0;var n=this._tileCoordsToBounds(t);return z(this.options.bounds).overlaps(n)},_keyToBounds:function(t){return this._tileCoordsToBounds(this._keyToTileCoords(t))},_tileCoordsToNwSe:function(t){var i=this._map,e=this.getTileSize(),n=t.scaleBy(e),o=n.add(e);return[i.unproject(n,t.z),i.unproject(o,t.z)]},_tileCoordsToBounds:function(t){var i=this._tileCoordsToNwSe(t),e=new T(i[0],i[1]);return this.options.noWrap||(e=this._map.wrapLatLngBounds(e)),e},_tileCoordsToKey:function(t){return t.x+":"+t.y+":"+t.z},_keyToTileCoords:function(t){var i=t.split(":"),e=new x(+i[0],+i[1]);return e.z=+i[2],e},_removeTile:function(t){var i=this._tiles[t];i&&(Ci||i.el.setAttribute("src",ni),ut(i.el),delete this._tiles[t],this.fire("tileunload",{tile:i.el,coords:this._keyToTileCoords(t)}))},_initTile:function(t){pt(t,"leaflet-tile");var i=this.getTileSize();t.style.width=i.x+"px",t.style.height=i.y+"px",t.onselectstart=r,t.onmousemove=r,Li&&this.options.opacity<1&&vt(t,this.options.opacity),Ti&&!zi&&(t.style.WebkitBackfaceVisibility="hidden")},_addTile:function(t,i){var n=this._getTilePos(t),o=this._tileCoordsToKey(t),s=this.createTile(this._wrapCoords(t),e(this._tileReady,this,t));this._initTile(s),this.createTile.length<2&&f(e(this._tileReady,this,t,null,s)),Lt(s,n),this._tiles[o]={el:s,coords:t,current:!0},i.appendChild(s),this.fire("tileloadstart",{tile:s,coords:t})},_tileReady:function(t,i,n){if(this._map){i&&this.fire("tileerror",{error:i,tile:n,coords:t});var o=this._tileCoordsToKey(t);(n=this._tiles[o])&&(n.loaded=+new Date,this._map._fadeAnimated?(vt(n.el,0),g(this._fadeFrame),this._fadeFrame=f(this._updateOpacity,this)):(n.active=!0,this._pruneTiles()),i||(pt(n.el,"leaflet-tile-loaded"),this.fire("tileload",{tile:n.el,coords:t})),this._noTilesToLoad()&&(this._loading=!1,this.fire("load"),Li||!this._map._fadeAnimated?f(this._pruneTiles,this):setTimeout(e(this._pruneTiles,this),250)))}},_getTilePos:function(t){return t.scaleBy(this.getTileSize()).subtract(this._level.origin)},_wrapCoords:function(t){var i=new x(this._wrapX?s(t.x,this._wrapX):t.x,this._wrapY?s(t.y,this._wrapY):t.y);return i.z=t.z,i},_pxBoundsToTileRange:function(t){var i=this.getTileSize();return new P(t.min.unscaleBy(i).floor(),t.max.unscaleBy(i).ceil().subtract([1,1]))},_noTilesToLoad:function(){for(var t in this._tiles)if(!this._tiles[t].loaded)return!1;return!0}}),dn=_n.extend({options:{minZoom:0,maxZoom:18,subdomains:"abc",errorTileUrl:"",zoomOffset:0,tms:!1,zoomReverse:!1,detectRetina:!1,crossOrigin:!1},initialize:function(t,i){this._url=t,(i=l(this,i)).detectRetina&&Ki&&i.maxZoom>0&&(i.tileSize=Math.floor(i.tileSize/2),i.zoomReverse?(i.zoomOffset--,i.minZoom++):(i.zoomOffset++,i.maxZoom--),i.minZoom=Math.max(0,i.minZoom)),"string"==typeof i.subdomains&&(i.subdomains=i.subdomains.split("")),Ti||this.on("tileunload",this._onTileRemove)},setUrl:function(t,i){return this._url=t,i||this.redraw(),this},createTile:function(t,i){var n=document.createElement("img");return V(n,"load",e(this._tileOnLoad,this,i,n)),V(n,"error",e(this._tileOnError,this,i,n)),this.options.crossOrigin&&(n.crossOrigin=""),n.alt="",n.setAttribute("role","presentation"),n.src=this.getTileUrl(t),n},getTileUrl:function(t){var e={r:Ki?"@2x":"",s:this._getSubdomain(t),x:t.x,y:t.y,z:this._getZoomForUrl()};if(this._map&&!this._map.options.crs.infinite){var n=this._globalTileRange.max.y-t.y;this.options.tms&&(e.y=n),e["-y"]=n}return _(this._url,i(e,this.options))},_tileOnLoad:function(t,i){Li?setTimeout(e(t,this,null,i),0):t(null,i)},_tileOnError:function(t,i,e){var n=this.options.errorTileUrl;n&&i.getAttribute("src")!==n&&(i.src=n),t(e,i)},_onTileRemove:function(t){t.tile.onload=null},_getZoomForUrl:function(){var t=this._tileZoom,i=this.options.maxZoom,e=this.options.zoomReverse,n=this.options.zoomOffset;return e&&(t=i-t),t+n},_getSubdomain:function(t){var i=Math.abs(t.x+t.y)%this.options.subdomains.length;return this.options.subdomains[i]},_abortLoading:function(){var t,i;for(t in this._tiles)this._tiles[t].coords.z!==this._tileZoom&&((i=this._tiles[t].el).onload=r,i.onerror=r,i.complete||(i.src=ni,ut(i),delete this._tiles[t]))}}),pn=dn.extend({defaultWmsParams:{service:"WMS",request:"GetMap",layers:"",styles:"",format:"image/jpeg",transparent:!1,version:"1.1.1"},options:{crs:null,uppercase:!1},initialize:function(t,e){this._url=t;var n=i({},this.defaultWmsParams);for(var o in e)o in this.options||(n[o]=e[o]);var s=(e=l(this,e)).detectRetina&&Ki?2:1,r=this.getTileSize();n.width=r.x*s,n.height=r.y*s,this.wmsParams=n},onAdd:function(t){this._crs=this.options.crs||t.options.crs,this._wmsVersion=parseFloat(this.wmsParams.version);var i=this._wmsVersion>=1.3?"crs":"srs";this.wmsParams[i]=this._crs.code,dn.prototype.onAdd.call(this,t)},getTileUrl:function(t){var i=this._tileCoordsToNwSe(t),e=this._crs,n=b(e.project(i[0]),e.project(i[1])),o=n.min,s=n.max,r=(this._wmsVersion>=1.3&&this._crs===He?[o.y,o.x,s.y,s.x]:[o.x,o.y,s.x,s.y]).join(","),a=L.TileLayer.prototype.getTileUrl.call(this,t);return a+c(this.wmsParams,a,this.options.uppercase)+(this.options.uppercase?"&BBOX=":"&bbox=")+r},setParams:function(t,e){return i(this.wmsParams,t),e||this.redraw(),this}});dn.WMS=pn,Yt.wms=function(t,i){return new pn(t,i)};var mn=Ue.extend({options:{padding:.1,tolerance:0},initialize:function(t){l(this,t),n(this),this._layers=this._layers||{}},onAdd:function(){this._container||(this._initContainer(),this._zoomAnimated&&pt(this._container,"leaflet-zoom-animated")),this.getPane().appendChild(this._container),this._update(),this.on("update",this._updatePaths,this)},onRemove:function(){this.off("update",this._updatePaths,this),this._destroyContainer()},getEvents:function(){var t={viewreset:this._reset,zoom:this._onZoom,moveend:this._update,zoomend:this._onZoomEnd};return this._zoomAnimated&&(t.zoomanim=this._onAnimZoom),t},_onAnimZoom:function(t){this._updateTransform(t.center,t.zoom)},_onZoom:function(){this._updateTransform(this._map.getCenter(),this._map.getZoom())},_updateTransform:function(t,i){var e=this._map.getZoomScale(i,this._zoom),n=Pt(this._container),o=this._map.getSize().multiplyBy(.5+this.options.padding),s=this._map.project(this._center,i),r=this._map.project(t,i).subtract(s),a=o.multiplyBy(-e).add(n).add(o).subtract(r);Ni?wt(this._container,a,e):Lt(this._container,a)},_reset:function(){this._update(),this._updateTransform(this._center,this._zoom);for(var t in this._layers)this._layers[t]._reset()},_onZoomEnd:function(){for(var t in this._layers)this._layers[t]._project()},_updatePaths:function(){for(var t in this._layers)this._layers[t]._update()},_update:function(){var t=this.options.padding,i=this._map.getSize(),e=this._map.containerPointToLayerPoint(i.multiplyBy(-t)).round();this._bounds=new P(e,e.add(i.multiplyBy(1+2*t)).round()),this._center=this._map.getCenter(),this._zoom=this._map.getZoom()}}),fn=mn.extend({getEvents:function(){var t=mn.prototype.getEvents.call(this);return t.viewprereset=this._onViewPreReset,t},_onViewPreReset:function(){this._postponeUpdatePaths=!0},onAdd:function(){mn.prototype.onAdd.call(this),this._draw()},_initContainer:function(){var t=this._container=document.createElement("canvas");V(t,"mousemove",o(this._onMouseMove,32,this),this),V(t,"click dblclick mousedown mouseup contextmenu",this._onClick,this),V(t,"mouseout",this._handleMouseOut,this),this._ctx=t.getContext("2d")},_destroyContainer:function(){delete this._ctx,ut(this._container),q(this._container),delete this._container},_updatePaths:function(){if(!this._postponeUpdatePaths){this._redrawBounds=null;for(var t in this._layers)this._layers[t]._update();this._redraw()}},_update:function(){if(!this._map._animatingZoom||!this._bounds){this._drawnLayers={},mn.prototype._update.call(this);var t=this._bounds,i=this._container,e=t.getSize(),n=Ki?2:1;Lt(i,t.min),i.width=n*e.x,i.height=n*e.y,i.style.width=e.x+"px",i.style.height=e.y+"px",Ki&&this._ctx.scale(2,2),this._ctx.translate(-t.min.x,-t.min.y),this.fire("update")}},_reset:function(){mn.prototype._reset.call(this),this._postponeUpdatePaths&&(this._postponeUpdatePaths=!1,this._updatePaths())},_initPath:function(t){this._updateDashArray(t),this._layers[n(t)]=t;var i=t._order={layer:t,prev:this._drawLast,next:null};this._drawLast&&(this._drawLast.next=i),this._drawLast=i,this._drawFirst=this._drawFirst||this._drawLast},_addPath:function(t){this._requestRedraw(t)},_removePath:function(t){var i=t._order,e=i.next,n=i.prev;e?e.prev=n:this._drawLast=n,n?n.next=e:this._drawFirst=e,delete t._order,delete this._layers[L.stamp(t)],this._requestRedraw(t)},_updatePath:function(t){this._extendRedrawBounds(t),t._project(),t._update(),this._requestRedraw(t)},_updateStyle:function(t){this._updateDashArray(t),this._requestRedraw(t)},_updateDashArray:function(t){if(t.options.dashArray){var i,e=t.options.dashArray.split(","),n=[];for(i=0;i<e.length;i++)n.push(Number(e[i]));t.options._dashArray=n}},_requestRedraw:function(t){this._map&&(this._extendRedrawBounds(t),this._redrawRequest=this._redrawRequest||f(this._redraw,this))},_extendRedrawBounds:function(t){if(t._pxBounds){var i=(t.options.weight||0)+1;this._redrawBounds=this._redrawBounds||new P,this._redrawBounds.extend(t._pxBounds.min.subtract([i,i])),this._redrawBounds.extend(t._pxBounds.max.add([i,i]))}},_redraw:function(){this._redrawRequest=null,this._redrawBounds&&(this._redrawBounds.min._floor(),this._redrawBounds.max._ceil()),this._clear(),this._draw(),this._redrawBounds=null},_clear:function(){var t=this._redrawBounds;if(t){var i=t.getSize();this._ctx.clearRect(t.min.x,t.min.y,i.x,i.y)}else this._ctx.clearRect(0,0,this._container.width,this._container.height)},_draw:function(){var t,i=this._redrawBounds;if(this._ctx.save(),i){var e=i.getSize();this._ctx.beginPath(),this._ctx.rect(i.min.x,i.min.y,e.x,e.y),this._ctx.clip()}this._drawing=!0;for(var n=this._drawFirst;n;n=n.next)t=n.layer,(!i||t._pxBounds&&t._pxBounds.intersects(i))&&t._updatePath();this._drawing=!1,this._ctx.restore()},_updatePoly:function(t,i){if(this._drawing){var e,n,o,s,r=t._parts,a=r.length,h=this._ctx;if(a){for(this._drawnLayers[t._leaflet_id]=t,h.beginPath(),e=0;e<a;e++){for(n=0,o=r[e].length;n<o;n++)s=r[e][n],h[n?"lineTo":"moveTo"](s.x,s.y);i&&h.closePath()}this._fillStroke(h,t)}}},_updateCircle:function(t){if(this._drawing&&!t._empty()){var i=t._point,e=this._ctx,n=Math.max(Math.round(t._radius),1),o=(Math.max(Math.round(t._radiusY),1)||n)/n;this._drawnLayers[t._leaflet_id]=t,1!==o&&(e.save(),e.scale(1,o)),e.beginPath(),e.arc(i.x,i.y/o,n,0,2*Math.PI,!1),1!==o&&e.restore(),this._fillStroke(e,t)}},_fillStroke:function(t,i){var e=i.options;e.fill&&(t.globalAlpha=e.fillOpacity,t.fillStyle=e.fillColor||e.color,t.fill(e.fillRule||"evenodd")),e.stroke&&0!==e.weight&&(t.setLineDash&&t.setLineDash(i.options&&i.options._dashArray||[]),t.globalAlpha=e.opacity,t.lineWidth=e.weight,t.strokeStyle=e.color,t.lineCap=e.lineCap,t.lineJoin=e.lineJoin,t.stroke())},_onClick:function(t){for(var i,e,n=this._map.mouseEventToLayerPoint(t),o=this._drawFirst;o;o=o.next)(i=o.layer).options.interactive&&i._containsPoint(n)&&!this._map._draggableMoved(i)&&(e=i);e&&(et(t),this._fireEvent([e],t))},_onMouseMove:function(t){if(this._map&&!this._map.dragging.moving()&&!this._map._animatingZoom){var i=this._map.mouseEventToLayerPoint(t);this._handleMouseHover(t,i)}},_handleMouseOut:function(t){var i=this._hoveredLayer;i&&(mt(this._container,"leaflet-interactive"),this._fireEvent([i],t,"mouseout"),this._hoveredLayer=null)},_handleMouseHover:function(t,i){for(var e,n,o=this._drawFirst;o;o=o.next)(e=o.layer).options.interactive&&e._containsPoint(i)&&(n=e);n!==this._hoveredLayer&&(this._handleMouseOut(t),n&&(pt(this._container,"leaflet-interactive"),this._fireEvent([n],t,"mouseover"),this._hoveredLayer=n)),this._hoveredLayer&&this._fireEvent([this._hoveredLayer],t)},_fireEvent:function(t,i,e){this._map._fireDOMEvent(i,e||i.type,t)},_bringToFront:function(t){var i=t._order,e=i.next,n=i.prev;e&&(e.prev=n,n?n.next=e:e&&(this._drawFirst=e),i.prev=this._drawLast,this._drawLast.next=i,i.next=null,this._drawLast=i,this._requestRedraw(t))},_bringToBack:function(t){var i=t._order,e=i.next,n=i.prev;n&&(n.next=e,e?e.prev=n:n&&(this._drawLast=n),i.prev=null,i.next=this._drawFirst,this._drawFirst.prev=i,this._drawFirst=i,this._requestRedraw(t))}}),gn=function(){try{return document.namespaces.add("lvml","urn:schemas-microsoft-com:vml"),function(t){return document.createElement("<lvml:"+t+' class="lvml">')}}catch(t){return function(t){return document.createElement("<"+t+' xmlns="urn:schemas-microsoft.com:vml" class="lvml">')}}}(),vn={_initContainer:function(){this._container=ht("div","leaflet-vml-container")},_update:function(){this._map._animatingZoom||(mn.prototype._update.call(this),this.fire("update"))},_initPath:function(t){var i=t._container=gn("shape");pt(i,"leaflet-vml-shape "+(this.options.className||"")),i.coordsize="1 1",t._path=gn("path"),i.appendChild(t._path),this._updateStyle(t),this._layers[n(t)]=t},_addPath:function(t){var i=t._container;this._container.appendChild(i),t.options.interactive&&t.addInteractiveTarget(i)},_removePath:function(t){var i=t._container;ut(i),t.removeInteractiveTarget(i),delete this._layers[n(t)]},_updateStyle:function(t){var i=t._stroke,e=t._fill,n=t.options,o=t._container;o.stroked=!!n.stroke,o.filled=!!n.fill,n.stroke?(i||(i=t._stroke=gn("stroke")),o.appendChild(i),i.weight=n.weight+"px",i.color=n.color,i.opacity=n.opacity,n.dashArray?i.dashStyle=ei(n.dashArray)?n.dashArray.join(" "):n.dashArray.replace(/( *, *)/g," "):i.dashStyle="",i.endcap=n.lineCap.replace("butt","flat"),i.joinstyle=n.lineJoin):i&&(o.removeChild(i),t._stroke=null),n.fill?(e||(e=t._fill=gn("fill")),o.appendChild(e),e.color=n.fillColor||n.color,e.opacity=n.fillOpacity):e&&(o.removeChild(e),t._fill=null)},_updateCircle:function(t){var i=t._point.round(),e=Math.round(t._radius),n=Math.round(t._radiusY||e);this._setPath(t,t._empty()?"M0 0":"AL "+i.x+","+i.y+" "+e+","+n+" 0,23592600")},_setPath:function(t,i){t._path.v=i},_bringToFront:function(t){ct(t._container)},_bringToBack:function(t){_t(t._container)}},yn=Ji?gn:E,xn=mn.extend({getEvents:function(){var t=mn.prototype.getEvents.call(this);return t.zoomstart=this._onZoomStart,t},_initContainer:function(){this._container=yn("svg"),this._container.setAttribute("pointer-events","none"),this._rootGroup=yn("g"),this._container.appendChild(this._rootGroup)},_destroyContainer:function(){ut(this._container),q(this._container),delete this._container,delete this._rootGroup,delete this._svgSize},_onZoomStart:function(){this._update()},_update:function(){if(!this._map._animatingZoom||!this._bounds){mn.prototype._update.call(this);var t=this._bounds,i=t.getSize(),e=this._container;this._svgSize&&this._svgSize.equals(i)||(this._svgSize=i,e.setAttribute("width",i.x),e.setAttribute("height",i.y)),Lt(e,t.min),e.setAttribute("viewBox",[t.min.x,t.min.y,i.x,i.y].join(" ")),this.fire("update")}},_initPath:function(t){var i=t._path=yn("path");t.options.className&&pt(i,t.options.className),t.options.interactive&&pt(i,"leaflet-interactive"),this._updateStyle(t),this._layers[n(t)]=t},_addPath:function(t){this._rootGroup||this._initContainer(),this._rootGroup.appendChild(t._path),t.addInteractiveTarget(t._path)},_removePath:function(t){ut(t._path),t.removeInteractiveTarget(t._path),delete this._layers[n(t)]},_updatePath:function(t){t._project(),t._update()},_updateStyle:function(t){var i=t._path,e=t.options;i&&(e.stroke?(i.setAttribute("stroke",e.color),i.setAttribute("stroke-opacity",e.opacity),i.setAttribute("stroke-width",e.weight),i.setAttribute("stroke-linecap",e.lineCap),i.setAttribute("stroke-linejoin",e.lineJoin),e.dashArray?i.setAttribute("stroke-dasharray",e.dashArray):i.removeAttribute("stroke-dasharray"),e.dashOffset?i.setAttribute("stroke-dashoffset",e.dashOffset):i.removeAttribute("stroke-dashoffset")):i.setAttribute("stroke","none"),e.fill?(i.setAttribute("fill",e.fillColor||e.color),i.setAttribute("fill-opacity",e.fillOpacity),i.setAttribute("fill-rule",e.fillRule||"evenodd")):i.setAttribute("fill","none"))},_updatePoly:function(t,i){this._setPath(t,k(t._parts,i))},_updateCircle:function(t){var i=t._point,e=Math.max(Math.round(t._radius),1),n="a"+e+","+(Math.max(Math.round(t._radiusY),1)||e)+" 0 1,0 ",o=t._empty()?"M0 0":"M"+(i.x-e)+","+i.y+n+2*e+",0 "+n+2*-e+",0 ";this._setPath(t,o)},_setPath:function(t,i){t._path.setAttribute("d",i)},_bringToFront:function(t){ct(t._path)},_bringToBack:function(t){_t(t._path)}});Ji&&xn.include(vn),Le.include({getRenderer:function(t){var i=t.options.renderer||this._getPaneRenderer(t.options.pane)||this.options.renderer||this._renderer;return i||(i=this._renderer=this.options.preferCanvas&&Xt()||Jt()),this.hasLayer(i)||this.addLayer(i),i},_getPaneRenderer:function(t){if("overlayPane"===t||void 0===t)return!1;var i=this._paneRenderers[t];return void 0===i&&(i=xn&&Jt({pane:t})||fn&&Xt({pane:t}),this._paneRenderers[t]=i),i}});var wn=en.extend({initialize:function(t,i){en.prototype.initialize.call(this,this._boundsToLatLngs(t),i)},setBounds:function(t){return this.setLatLngs(this._boundsToLatLngs(t))},_boundsToLatLngs:function(t){return t=z(t),[t.getSouthWest(),t.getNorthWest(),t.getNorthEast(),t.getSouthEast()]}});xn.create=yn,xn.pointsToPath=k,nn.geometryToLayer=Wt,nn.coordsToLatLng=Ht,nn.coordsToLatLngs=Ft,nn.latLngToCoords=Ut,nn.latLngsToCoords=Vt,nn.getFeature=qt,nn.asFeature=Gt,Le.mergeOptions({boxZoom:!0});var Ln=Ze.extend({initialize:function(t){this._map=t,this._container=t._container,this._pane=t._panes.overlayPane,this._resetStateTimeout=0,t.on("unload",this._destroy,this)},addHooks:function(){V(this._container,"mousedown",this._onMouseDown,this)},removeHooks:function(){q(this._container,"mousedown",this._onMouseDown,this)},moved:function(){return this._moved},_destroy:function(){ut(this._pane),delete this._pane},_resetState:function(){this._resetStateTimeout=0,this._moved=!1},_clearDeferredResetState:function(){0!==this._resetStateTimeout&&(clearTimeout(this._resetStateTimeout),this._resetStateTimeout=0)},_onMouseDown:function(t){if(!t.shiftKey||1!==t.which&&1!==t.button)return!1;this._clearDeferredResetState(),this._resetState(),mi(),bt(),this._startPoint=this._map.mouseEventToContainerPoint(t),V(document,{contextmenu:Q,mousemove:this._onMouseMove,mouseup:this._onMouseUp,keydown:this._onKeyDown},this)},_onMouseMove:function(t){this._moved||(this._moved=!0,this._box=ht("div","leaflet-zoom-box",this._container),pt(this._container,"leaflet-crosshair"),this._map.fire("boxzoomstart")),this._point=this._map.mouseEventToContainerPoint(t);var i=new P(this._point,this._startPoint),e=i.getSize();Lt(this._box,i.min),this._box.style.width=e.x+"px",this._box.style.height=e.y+"px"},_finish:function(){this._moved&&(ut(this._box),mt(this._container,"leaflet-crosshair")),fi(),Tt(),q(document,{contextmenu:Q,mousemove:this._onMouseMove,mouseup:this._onMouseUp,keydown:this._onKeyDown},this)},_onMouseUp:function(t){if((1===t.which||1===t.button)&&(this._finish(),this._moved)){this._clearDeferredResetState(),this._resetStateTimeout=setTimeout(e(this._resetState,this),0);var i=new T(this._map.containerPointToLatLng(this._startPoint),this._map.containerPointToLatLng(this._point));this._map.fitBounds(i).fire("boxzoomend",{boxZoomBounds:i})}},_onKeyDown:function(t){27===t.keyCode&&this._finish()}});Le.addInitHook("addHandler","boxZoom",Ln),Le.mergeOptions({doubleClickZoom:!0});var Pn=Ze.extend({addHooks:function(){this._map.on("dblclick",this._onDoubleClick,this)},removeHooks:function(){this._map.off("dblclick",this._onDoubleClick,this)},_onDoubleClick:function(t){var i=this._map,e=i.getZoom(),n=i.options.zoomDelta,o=t.originalEvent.shiftKey?e-n:e+n;"center"===i.options.doubleClickZoom?i.setZoom(o):i.setZoomAround(t.containerPoint,o)}});Le.addInitHook("addHandler","doubleClickZoom",Pn),Le.mergeOptions({dragging:!0,inertia:!zi,inertiaDeceleration:3400,inertiaMaxSpeed:1/0,easeLinearity:.2,worldCopyJump:!1,maxBoundsViscosity:0});var bn=Ze.extend({addHooks:function(){if(!this._draggable){var t=this._map;this._draggable=new Be(t._mapPane,t._container),this._draggable.on({dragstart:this._onDragStart,drag:this._onDrag,dragend:this._onDragEnd},this),this._draggable.on("predrag",this._onPreDragLimit,this),t.options.worldCopyJump&&(this._draggable.on("predrag",this._onPreDragWrap,this),t.on("zoomend",this._onZoomEnd,this),t.whenReady(this._onZoomEnd,this))}pt(this._map._container,"leaflet-grab leaflet-touch-drag"),this._draggable.enable(),this._positions=[],this._times=[]},removeHooks:function(){mt(this._map._container,"leaflet-grab"),mt(this._map._container,"leaflet-touch-drag"),this._draggable.disable()},moved:function(){return this._draggable&&this._draggable._moved},moving:function(){return this._draggable&&this._draggable._moving},_onDragStart:function(){var t=this._map;if(t._stop(),this._map.options.maxBounds&&this._map.options.maxBoundsViscosity){var i=z(this._map.options.maxBounds);this._offsetLimit=b(this._map.latLngToContainerPoint(i.getNorthWest()).multiplyBy(-1),this._map.latLngToContainerPoint(i.getSouthEast()).multiplyBy(-1).add(this._map.getSize())),this._viscosity=Math.min(1,Math.max(0,this._map.options.maxBoundsViscosity))}else this._offsetLimit=null;t.fire("movestart").fire("dragstart"),t.options.inertia&&(this._positions=[],this._times=[])},_onDrag:function(t){if(this._map.options.inertia){var i=this._lastTime=+new Date,e=this._lastPos=this._draggable._absPos||this._draggable._newPos;this._positions.push(e),this._times.push(i),this._prunePositions(i)}this._map.fire("move",t).fire("drag",t)},_prunePositions:function(t){for(;this._positions.length>1&&t-this._times[0]>50;)this._positions.shift(),this._times.shift()},_onZoomEnd:function(){var t=this._map.getSize().divideBy(2),i=this._map.latLngToLayerPoint([0,0]);this._initialWorldOffset=i.subtract(t).x,this._worldWidth=this._map.getPixelWorldBounds().getSize().x},_viscousLimit:function(t,i){return t-(t-i)*this._viscosity},_onPreDragLimit:function(){if(this._viscosity&&this._offsetLimit){var t=this._draggable._newPos.subtract(this._draggable._startPos),i=this._offsetLimit;t.x<i.min.x&&(t.x=this._viscousLimit(t.x,i.min.x)),t.y<i.min.y&&(t.y=this._viscousLimit(t.y,i.min.y)),t.x>i.max.x&&(t.x=this._viscousLimit(t.x,i.max.x)),t.y>i.max.y&&(t.y=this._viscousLimit(t.y,i.max.y)),this._draggable._newPos=this._draggable._startPos.add(t)}},_onPreDragWrap:function(){var t=this._worldWidth,i=Math.round(t/2),e=this._initialWorldOffset,n=this._draggable._newPos.x,o=(n-i+e)%t+i-e,s=(n+i+e)%t-i-e,r=Math.abs(o+e)<Math.abs(s+e)?o:s;this._draggable._absPos=this._draggable._newPos.clone(),this._draggable._newPos.x=r},_onDragEnd:function(t){var i=this._map,e=i.options,n=!e.inertia||this._times.length<2;if(i.fire("dragend",t),n)i.fire("moveend");else{this._prunePositions(+new Date);var o=this._lastPos.subtract(this._positions[0]),s=(this._lastTime-this._times[0])/1e3,r=e.easeLinearity,a=o.multiplyBy(r/s),h=a.distanceTo([0,0]),u=Math.min(e.inertiaMaxSpeed,h),l=a.multiplyBy(u/h),c=u/(e.inertiaDeceleration*r),_=l.multiplyBy(-c/2).round();_.x||_.y?(_=i._limitOffset(_,i.options.maxBounds),f(function(){i.panBy(_,{duration:c,easeLinearity:r,noMoveStart:!0,animate:!0})})):i.fire("moveend")}}});Le.addInitHook("addHandler","dragging",bn),Le.mergeOptions({keyboard:!0,keyboardPanDelta:80});var Tn=Ze.extend({keyCodes:{left:[37],right:[39],down:[40],up:[38],zoomIn:[187,107,61,171],zoomOut:[189,109,54,173]},initialize:function(t){this._map=t,this._setPanDelta(t.options.keyboardPanDelta),this._setZoomDelta(t.options.zoomDelta)},addHooks:function(){var t=this._map._container;t.tabIndex<=0&&(t.tabIndex="0"),V(t,{focus:this._onFocus,blur:this._onBlur,mousedown:this._onMouseDown},this),this._map.on({focus:this._addHooks,blur:this._removeHooks},this)},removeHooks:function(){this._removeHooks(),q(this._map._container,{focus:this._onFocus,blur:this._onBlur,mousedown:this._onMouseDown},this),this._map.off({focus:this._addHooks,blur:this._removeHooks},this)},_onMouseDown:function(){if(!this._focused){var t=document.body,i=document.documentElement,e=t.scrollTop||i.scrollTop,n=t.scrollLeft||i.scrollLeft;this._map._container.focus(),window.scrollTo(n,e)}},_onFocus:function(){this._focused=!0,this._map.fire("focus")},_onBlur:function(){this._focused=!1,this._map.fire("blur")},_setPanDelta:function(t){var i,e,n=this._panKeys={},o=this.keyCodes;for(i=0,e=o.left.length;i<e;i++)n[o.left[i]]=[-1*t,0];for(i=0,e=o.right.length;i<e;i++)n[o.right[i]]=[t,0];for(i=0,e=o.down.length;i<e;i++)n[o.down[i]]=[0,t];for(i=0,e=o.up.length;i<e;i++)n[o.up[i]]=[0,-1*t]},_setZoomDelta:function(t){var i,e,n=this._zoomKeys={},o=this.keyCodes;for(i=0,e=o.zoomIn.length;i<e;i++)n[o.zoomIn[i]]=t;for(i=0,e=o.zoomOut.length;i<e;i++)n[o.zoomOut[i]]=-t},_addHooks:function(){V(document,"keydown",this._onKeyDown,this)},_removeHooks:function(){q(document,"keydown",this._onKeyDown,this)},_onKeyDown:function(t){if(!(t.altKey||t.ctrlKey||t.metaKey)){var i,e=t.keyCode,n=this._map;if(e in this._panKeys){if(n._panAnim&&n._panAnim._inProgress)return;i=this._panKeys[e],t.shiftKey&&(i=w(i).multiplyBy(3)),n.panBy(i),n.options.maxBounds&&n.panInsideBounds(n.options.maxBounds)}else if(e in this._zoomKeys)n.setZoom(n.getZoom()+(t.shiftKey?3:1)*this._zoomKeys[e]);else{if(27!==e||!n._popup||!n._popup.options.closeOnEscapeKey)return;n.closePopup()}Q(t)}}});Le.addInitHook("addHandler","keyboard",Tn),Le.mergeOptions({scrollWheelZoom:!0,wheelDebounceTime:40,wheelPxPerZoomLevel:60});var zn=Ze.extend({addHooks:function(){V(this._map._container,"mousewheel",this._onWheelScroll,this),this._delta=0},removeHooks:function(){q(this._map._container,"mousewheel",this._onWheelScroll,this)},_onWheelScroll:function(t){var i=it(t),n=this._map.options.wheelDebounceTime;this._delta+=i,this._lastMousePos=this._map.mouseEventToContainerPoint(t),this._startTime||(this._startTime=+new Date);var o=Math.max(n-(+new Date-this._startTime),0);clearTimeout(this._timer),this._timer=setTimeout(e(this._performZoom,this),o),Q(t)},_performZoom:function(){var t=this._map,i=t.getZoom(),e=this._map.options.zoomSnap||0;t._stop();var n=this._delta/(4*this._map.options.wheelPxPerZoomLevel),o=4*Math.log(2/(1+Math.exp(-Math.abs(n))))/Math.LN2,s=e?Math.ceil(o/e)*e:o,r=t._limitZoom(i+(this._delta>0?s:-s))-i;this._delta=0,this._startTime=null,r&&("center"===t.options.scrollWheelZoom?t.setZoom(i+r):t.setZoomAround(this._lastMousePos,i+r))}});Le.addInitHook("addHandler","scrollWheelZoom",zn),Le.mergeOptions({tap:!0,tapTolerance:15});var Mn=Ze.extend({addHooks:function(){V(this._map._container,"touchstart",this._onDown,this)},removeHooks:function(){q(this._map._container,"touchstart",this._onDown,this)},_onDown:function(t){if(t.touches){if($(t),this._fireClick=!0,t.touches.length>1)return this._fireClick=!1,void clearTimeout(this._holdTimeout);var i=t.touches[0],n=i.target;this._startPos=this._newPos=new x(i.clientX,i.clientY),n.tagName&&"a"===n.tagName.toLowerCase()&&pt(n,"leaflet-active"),this._holdTimeout=setTimeout(e(function(){this._isTapValid()&&(this._fireClick=!1,this._onUp(),this._simulateEvent("contextmenu",i))},this),1e3),this._simulateEvent("mousedown",i),V(document,{touchmove:this._onMove,touchend:this._onUp},this)}},_onUp:function(t){if(clearTimeout(this._holdTimeout),q(document,{touchmove:this._onMove,touchend:this._onUp},this),this._fireClick&&t&&t.changedTouches){var i=t.changedTouches[0],e=i.target;e&&e.tagName&&"a"===e.tagName.toLowerCase()&&mt(e,"leaflet-active"),this._simulateEvent("mouseup",i),this._isTapValid()&&this._simulateEvent("click",i)}},_isTapValid:function(){return this._newPos.distanceTo(this._startPos)<=this._map.options.tapTolerance},_onMove:function(t){var i=t.touches[0];this._newPos=new x(i.clientX,i.clientY),this._simulateEvent("mousemove",i)},_simulateEvent:function(t,i){var e=document.createEvent("MouseEvents");e._simulated=!0,i.target._simulatedClick=!0,e.initMouseEvent(t,!0,!0,window,1,i.screenX,i.screenY,i.clientX,i.clientY,!1,!1,!1,!1,0,null),i.target.dispatchEvent(e)}});Vi&&!Ui&&Le.addInitHook("addHandler","tap",Mn),Le.mergeOptions({touchZoom:Vi&&!zi,bounceAtZoomLimits:!0});var Cn=Ze.extend({addHooks:function(){pt(this._map._container,"leaflet-touch-zoom"),V(this._map._container,"touchstart",this._onTouchStart,this)},removeHooks:function(){mt(this._map._container,"leaflet-touch-zoom"),q(this._map._container,"touchstart",this._onTouchStart,this)},_onTouchStart:function(t){var i=this._map;if(t.touches&&2===t.touches.length&&!i._animatingZoom&&!this._zooming){var e=i.mouseEventToContainerPoint(t.touches[0]),n=i.mouseEventToContainerPoint(t.touches[1]);this._centerPoint=i.getSize()._divideBy(2),this._startLatLng=i.containerPointToLatLng(this._centerPoint),"center"!==i.options.touchZoom&&(this._pinchStartLatLng=i.containerPointToLatLng(e.add(n)._divideBy(2))),this._startDist=e.distanceTo(n),this._startZoom=i.getZoom(),this._moved=!1,this._zooming=!0,i._stop(),V(document,"touchmove",this._onTouchMove,this),V(document,"touchend",this._onTouchEnd,this),$(t)}},_onTouchMove:function(t){if(t.touches&&2===t.touches.length&&this._zooming){var i=this._map,n=i.mouseEventToContainerPoint(t.touches[0]),o=i.mouseEventToContainerPoint(t.touches[1]),s=n.distanceTo(o)/this._startDist;if(this._zoom=i.getScaleZoom(s,this._startZoom),!i.options.bounceAtZoomLimits&&(this._zoom<i.getMinZoom()&&s<1||this._zoom>i.getMaxZoom()&&s>1)&&(this._zoom=i._limitZoom(this._zoom)),"center"===i.options.touchZoom){if(this._center=this._startLatLng,1===s)return}else{var r=n._add(o)._divideBy(2)._subtract(this._centerPoint);if(1===s&&0===r.x&&0===r.y)return;this._center=i.unproject(i.project(this._pinchStartLatLng,this._zoom).subtract(r),this._zoom)}this._moved||(i._moveStart(!0,!1),this._moved=!0),g(this._animRequest);var a=e(i._move,i,this._center,this._zoom,{pinch:!0,round:!1});this._animRequest=f(a,this,!0),$(t)}},_onTouchEnd:function(){this._moved&&this._zooming?(this._zooming=!1,g(this._animRequest),q(document,"touchmove",this._onTouchMove),q(document,"touchend",this._onTouchEnd),this._map.options.zoomAnimation?this._map._animateZoom(this._center,this._map._limitZoom(this._zoom),!0,this._map.options.zoomSnap):this._map._resetView(this._center,this._map._limitZoom(this._zoom))):this._zooming=!1}});Le.addInitHook("addHandler","touchZoom",Cn),Le.BoxZoom=Ln,Le.DoubleClickZoom=Pn,Le.Drag=bn,Le.Keyboard=Tn,Le.ScrollWheelZoom=zn,Le.Tap=Mn,Le.TouchZoom=Cn;var Zn=window.L;window.L=t,Object.freeze=$t,t.version="1.3.1",t.noConflict=function(){return window.L=Zn,this},t.Control=Pe,t.control=be,t.Browser=$i,t.Evented=ui,t.Mixin=Ee,t.Util=ai,t.Class=v,t.Handler=Ze,t.extend=i,t.bind=e,t.stamp=n,t.setOptions=l,t.DomEvent=de,t.DomUtil=xe,t.PosAnimation=we,t.Draggable=Be,t.LineUtil=Oe,t.PolyUtil=Re,t.Point=x,t.point=w,t.Bounds=P,t.bounds=b,t.Transformation=Z,t.transformation=S,t.Projection=je,t.LatLng=M,t.latLng=C,t.LatLngBounds=T,t.latLngBounds=z,t.CRS=ci,t.GeoJSON=nn,t.geoJSON=Kt,t.geoJson=sn,t.Layer=Ue,t.LayerGroup=Ve,t.layerGroup=function(t,i){return new Ve(t,i)},t.FeatureGroup=qe,t.featureGroup=function(t){return new qe(t)},t.ImageOverlay=rn,t.imageOverlay=function(t,i,e){return new rn(t,i,e)},t.VideoOverlay=an,t.videoOverlay=function(t,i,e){return new an(t,i,e)},t.DivOverlay=hn,t.Popup=un,t.popup=function(t,i){return new un(t,i)},t.Tooltip=ln,t.tooltip=function(t,i){return new ln(t,i)},t.Icon=Ge,t.icon=function(t){return new Ge(t)},t.DivIcon=cn,t.divIcon=function(t){return new cn(t)},t.Marker=Xe,t.marker=function(t,i){return new Xe(t,i)},t.TileLayer=dn,t.tileLayer=Yt,t.GridLayer=_n,t.gridLayer=function(t){return new _n(t)},t.SVG=xn,t.svg=Jt,t.Renderer=mn,t.Canvas=fn,t.canvas=Xt,t.Path=Je,t.CircleMarker=$e,t.circleMarker=function(t,i){return new $e(t,i)},t.Circle=Qe,t.circle=function(t,i,e){return new Qe(t,i,e)},t.Polyline=tn,t.polyline=function(t,i){return new tn(t,i)},t.Polygon=en,t.polygon=function(t,i){return new en(t,i)},t.Rectangle=wn,t.rectangle=function(t,i){return new wn(t,i)},t.Map=Le,t.map=function(t,i){return new Le(t,i)}});
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

function RoughSegmentRelation() {
  return {
    LEFT: 0,
    RIGHT: 1,
    INTERSECTS: 2,
    AHEAD: 3,
    BEHIND: 4,
    SEPARATE: 5,
    UNDEFINED: 6
  };
}

class RoughSegment {
  constructor(px1, py1, px2, py2) {
    this.RoughSegmentRelationConst = RoughSegmentRelation();
    this.px1 = px1;
    this.py1 = py1;
    this.px2 = px2;
    this.py2 = py2;
    this.xi = Number.MAX_VALUE;
    this.yi = Number.MAX_VALUE;
    this.a = py2 - py1;
    this.b = px1 - px2;
    this.c = px2 * py1 - px1 * py2;
    this._undefined = ((this.a == 0) && (this.b == 0) && (this.c == 0));
  }

  isUndefined() {
    return this._undefined;
  }

  compare(otherSegment) {
    if (this.isUndefined() || otherSegment.isUndefined()) {
      return this.RoughSegmentRelationConst.UNDEFINED;
    }
    var grad1 = Number.MAX_VALUE;
    var grad2 = Number.MAX_VALUE;
    var int1 = 0, int2 = 0;
    var a = this.a, b = this.b, c = this.c;

    if (Math.abs(b) > 0.00001) {
      grad1 = -a / b;
      int1 = -c / b;
    }
    if (Math.abs(otherSegment.b) > 0.00001) {
      grad2 = -otherSegment.a / otherSegment.b;
      int2 = -otherSegment.c / otherSegment.b;
    }

    if (grad1 == Number.MAX_VALUE) {
      if (grad2 == Number.MAX_VALUE) {
        if ((-c / a) != (-otherSegment.c / otherSegment.a)) {
          return this.RoughSegmentRelationConst.SEPARATE;
        }
        if ((this.py1 >= Math.min(otherSegment.py1, otherSegment.py2)) && (this.py1 <= Math.max(otherSegment.py1, otherSegment.py2))) {
          this.xi = this.px1;
          this.yi = this.py1;
          return this.RoughSegmentRelationConst.INTERSECTS;
        }
        if ((this.py2 >= Math.min(otherSegment.py1, otherSegment.py2)) && (this.py2 <= Math.max(otherSegment.py1, otherSegment.py2))) {
          this.xi = this.px2;
          this.yi = this.py2;
          return this.RoughSegmentRelationConst.INTERSECTS;
        }
        return this.RoughSegmentRelationConst.SEPARATE;
      }
      this.xi = this.px1;
      this.yi = (grad2 * this.xi + int2);
      if (((this.py1 - this.yi) * (this.yi - this.py2) < -0.00001) || ((otherSegment.py1 - this.yi) * (this.yi - otherSegment.py2) < -0.00001)) {
        return this.RoughSegmentRelationConst.SEPARATE;
      }
      if (Math.abs(otherSegment.a) < 0.00001) {
        if ((otherSegment.px1 - this.xi) * (this.xi - otherSegment.px2) < -0.00001) {
          return this.RoughSegmentRelationConst.SEPARATE;
        }
        return this.RoughSegmentRelationConst.INTERSECTS;
      }
      return this.RoughSegmentRelationConst.INTERSECTS;
    }

    if (grad2 == Number.MAX_VALUE) {
      this.xi = otherSegment.px1;
      this.yi = grad1 * this.xi + int1;
      if (((otherSegment.py1 - this.yi) * (this.yi - otherSegment.py2) < -0.00001) || ((this.py1 - this.yi) * (this.yi - this.py2) < -0.00001)) {
        return this.RoughSegmentRelationConst.SEPARATE;
      }
      if (Math.abs(a) < 0.00001) {
        if ((this.px1 - this.xi) * (this.xi - this.px2) < -0.00001) {
          return this.RoughSegmentRelationConst.SEPARATE;
        }
        return this.RoughSegmentRelationConst.INTERSECTS;
      }
      return this.RoughSegmentRelationConst.INTERSECTS;
    }

    if (grad1 == grad2) {
      if (int1 != int2) {
        return this.RoughSegmentRelationConst.SEPARATE;
      }
      if ((this.px1 >= Math.min(otherSegment.px1, otherSegment.px2)) && (this.px1 <= Math.max(otherSegment.py1, otherSegment.py2))) {
        this.xi = this.px1;
        this.yi = this.py1;
        return this.RoughSegmentRelationConst.INTERSECTS;
      }
      if ((this.px2 >= Math.min(otherSegment.px1, otherSegment.px2)) && (this.px2 <= Math.max(otherSegment.px1, otherSegment.px2))) {
        this.xi = this.px2;
        this.yi = this.py2;
        return this.RoughSegmentRelationConst.INTERSECTS;
      }
      return this.RoughSegmentRelationConst.SEPARATE;
    }

    this.xi = ((int2 - int1) / (grad1 - grad2));
    this.yi = (grad1 * this.xi + int1);

    if (((this.px1 - this.xi) * (this.xi - this.px2) < -0.00001) || ((otherSegment.px1 - this.xi) * (this.xi - otherSegment.px2) < -0.00001)) {
      return this.RoughSegmentRelationConst.SEPARATE;
    }
    return this.RoughSegmentRelationConst.INTERSECTS;
  }

  getLength() {
    return this._getLength(this.px1, this.py1, this.px2, this.py2);
  }

  _getLength(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

class RoughHachureIterator {
  constructor(top, bottom, left, right, gap, sinAngle, cosAngle, tanAngle) {
    this.top = top;
    this.bottom = bottom;
    this.left = left;
    this.right = right;
    this.gap = gap;
    this.sinAngle = sinAngle;
    this.tanAngle = tanAngle;

    if (Math.abs(sinAngle) < 0.0001) {
      this.pos = left + gap;
    } else if (Math.abs(sinAngle) > 0.9999) {
      this.pos = top + gap;
    } else {
      this.deltaX = (bottom - top) * Math.abs(tanAngle);
      this.pos = left - Math.abs(this.deltaX);
      this.hGap = Math.abs(gap / cosAngle);
      this.sLeft = new RoughSegment(left, bottom, left, top);
      this.sRight = new RoughSegment(right, bottom, right, top);
    }
  }

  getNextLine() {
    if (Math.abs(this.sinAngle) < 0.0001) {
      if (this.pos < this.right) {
        let line = [this.pos, this.top, this.pos, this.bottom];
        this.pos += this.gap;
        return line;
      }
    } else if (Math.abs(this.sinAngle) > 0.9999) {
      if (this.pos < this.bottom) {
        let line = [this.left, this.pos, this.right, this.pos];
        this.pos += this.gap;
        return line;
      }
    } else {
      let xLower = this.pos - this.deltaX / 2;
      let xUpper = this.pos + this.deltaX / 2;
      let yLower = this.bottom;
      let yUpper = this.top;
      if (this.pos < (this.right + this.deltaX)) {
        while (((xLower < this.left) && (xUpper < this.left)) || ((xLower > this.right) && (xUpper > this.right))) {
          this.pos += this.hGap;
          xLower = this.pos - this.deltaX / 2;
          xUpper = this.pos + this.deltaX / 2;
          if (this.pos > (this.right + this.deltaX)) {
            return null;
          }
        }
        let s = new RoughSegment(xLower, yLower, xUpper, yUpper);
        if (s.compare(this.sLeft) == RoughSegmentRelation().INTERSECTS) {
          xLower = s.xi;
          yLower = s.yi;
        }
        if (s.compare(this.sRight) == RoughSegmentRelation().INTERSECTS) {
          xUpper = s.xi;
          yUpper = s.yi;
        }
        if (this.tanAngle > 0) {
          xLower = this.right - (xLower - this.left);
          xUpper = this.right - (xUpper - this.left);
        }
        let line = [xLower, yLower, xUpper, yUpper];
        this.pos += this.hGap;
        return line;
      }
    }
    return null;
  }
}

class PathToken {
  constructor(type, text) {
    this.type = type;
    this.text = text;
  }
  isType(type) {
    return this.type === type;
  }
}

class ParsedPath {
  constructor(d) {
    this.PARAMS = {
      A: ["rx", "ry", "x-axis-rotation", "large-arc-flag", "sweep-flag", "x", "y"],
      a: ["rx", "ry", "x-axis-rotation", "large-arc-flag", "sweep-flag", "x", "y"],
      C: ["x1", "y1", "x2", "y2", "x", "y"],
      c: ["x1", "y1", "x2", "y2", "x", "y"],
      H: ["x"],
      h: ["x"],
      L: ["x", "y"],
      l: ["x", "y"],
      M: ["x", "y"],
      m: ["x", "y"],
      Q: ["x1", "y1", "x", "y"],
      q: ["x1", "y1", "x", "y"],
      S: ["x2", "y2", "x", "y"],
      s: ["x2", "y2", "x", "y"],
      T: ["x", "y"],
      t: ["x", "y"],
      V: ["y"],
      v: ["y"],
      Z: [],
      z: []
    };
    this.COMMAND = 0;
    this.NUMBER = 1;
    this.EOD = 2;
    this.segments = [];
    this.d = d || "";
    this.parseData(d);
    this.processPoints();
  }

  loadFromSegments(segments) {
    this.segments = segments;
    this.processPoints();
  }

  processPoints() {
    let first = null, currentPoint = [0, 0];
    for (let i = 0; i < this.segments.length; i++) {
      let s = this.segments[i];
      switch (s.key) {
        case 'M':
        case 'L':
        case 'T':
          s.point = [s.data[0], s.data[1]];
          break;
        case 'm':
        case 'l':
        case 't':
          s.point = [s.data[0] + currentPoint[0], s.data[1] + currentPoint[1]];
          break;
        case 'H':
          s.point = [s.data[0], currentPoint[1]];
          break;
        case 'h':
          s.point = [s.data[0] + currentPoint[0], currentPoint[1]];
          break;
        case 'V':
          s.point = [currentPoint[0], s.data[0]];
          break;
        case 'v':
          s.point = [currentPoint[0], s.data[0] + currentPoint[1]];
          break;
        case 'z':
        case 'Z':
          if (first) {
            s.point = [first[0], first[1]];
          }
          break;
        case 'C':
          s.point = [s.data[4], s.data[5]];
          break;
        case 'c':
          s.point = [s.data[4] + currentPoint[0], s.data[5] + currentPoint[1]];
          break;
        case 'S':
          s.point = [s.data[2], s.data[3]];
          break;
        case 's':
          s.point = [s.data[2] + currentPoint[0], s.data[3] + currentPoint[1]];
          break;
        case 'Q':
          s.point = [s.data[2], s.data[3]];
          break;
        case 'q':
          s.point = [s.data[2] + currentPoint[0], s.data[3] + currentPoint[1]];
          break;
        case 'A':
          s.point = [s.data[5], s.data[6]];
          break;
        case 'a':
          s.point = [s.data[5] + currentPoint[0], s.data[6] + currentPoint[1]];
          break;
      }
      if (s.key === 'm' || s.key === 'M') {
        first = null;
      }
      if (s.point) {
        currentPoint = s.point;
        if (!first) {
          first = s.point;
        }
      }
      if (s.key === 'z' || s.key === 'Z') {
        first = null;
      }
    }
  }

  get closed() {
    if (typeof this._closed === 'undefined') {
      this._closed = false;
      for (let s of this.segments) {
        if (s.key.toLowerCase() === 'z') {
          this._closed = true;
        }
      }
    }
    return this._closed;
  }

  parseData(d) {
    var tokens = this.tokenize(d);
    var index = 0;
    var token = tokens[index];
    var mode = "BOD";
    this.segments = new Array();
    while (!token.isType(this.EOD)) {
      var param_length;
      var params = new Array();
      if (mode == "BOD") {
        if (token.text == "M" || token.text == "m") {
          index++;
          param_length = this.PARAMS[token.text].length;
          mode = token.text;
        } else {
          return this.parseData('M0,0' + d);
        }
      } else {
        if (token.isType(this.NUMBER)) {
          param_length = this.PARAMS[mode].length;
        } else {
          index++;
          param_length = this.PARAMS[token.text].length;
          mode = token.text;
        }
      }

      if ((index + param_length) < tokens.length) {
        for (var i = index; i < index + param_length; i++) {
          var number = tokens[i];
          if (number.isType(this.NUMBER)) {
            params[params.length] = number.text;
          }
          else {
            console.error("Parameter type is not a number: " + mode + "," + number.text);
            return;
          }
        }
        var segment;
        if (this.PARAMS[mode]) {
          segment = { key: mode, data: params };
        } else {
          console.error("Unsupported segment type: " + mode);
          return;
        }
        this.segments.push(segment);
        index += param_length;
        token = tokens[index];
        if (mode == "M") mode = "L";
        if (mode == "m") mode = "l";
      } else {
        console.error("Path data ended before all parameters were found");
      }
    }
  }

  tokenize(d) {
    var tokens = new Array();
    while (d != "") {
      if (d.match(/^([ \t\r\n,]+)/)) {
        d = d.substr(RegExp.$1.length);
      } else if (d.match(/^([aAcChHlLmMqQsStTvVzZ])/)) {
        tokens[tokens.length] = new PathToken(this.COMMAND, RegExp.$1);
        d = d.substr(RegExp.$1.length);
      } else if (d.match(/^(([-+]?[0-9]+(\.[0-9]*)?|[-+]?\.[0-9]+)([eE][-+]?[0-9]+)?)/)) {
        tokens[tokens.length] = new PathToken(this.NUMBER, parseFloat(RegExp.$1));
        d = d.substr(RegExp.$1.length);
      } else {
        console.error("Unrecognized segment command: " + d);
        return null;
      }
    }
    tokens[tokens.length] = new PathToken(this.EOD, null);
    return tokens;
  }
}

class RoughPath {
  constructor(d) {
    this.d = d;
    this.parsed = new ParsedPath(d);
    this._position = [0, 0];
    this.bezierReflectionPoint = null;
    this.quadReflectionPoint = null;
    this._first = null;
  }

  get segments() {
    return this.parsed.segments;
  }

  get closed() {
    return this.parsed.closed;
  }

  get linearPoints() {
    if (!this._linearPoints) {
      const lp = [];
      let points = [];
      for (let s of this.parsed.segments) {
        let key = s.key.toLowerCase();
        if (key === 'm' || key === 'z') {
          if (points.length) {
            lp.push(points);
            points = [];
          }
          if (key === 'z') {
            continue;
          }
        }
        if (s.point) {
          points.push(s.point);
        }
      }
      if (points.length) {
        lp.push(points);
        points = [];
      }
      this._linearPoints = lp;
    }
    return this._linearPoints;
  }

  get first() {
    return this._first;
  }

  set first(v) {
    this._first = v;
  }

  setPosition(x, y) {
    this._position = [x, y];
    if (!this._first) {
      this._first = [x, y];
    }
  }

  get position() {
    return this._position;
  }

  get x() {
    return this._position[0];
  }

  get y() {
    return this._position[1];
  }
}

class RoughArcConverter {
  // Algorithm as described in https://www.w3.org/TR/SVG/implnote.html
  // Code adapted from nsSVGPathDataParser.cpp in Mozilla 
  // https://hg.mozilla.org/mozilla-central/file/17156fbebbc8/content/svg/content/src/nsSVGPathDataParser.cpp#l887
  constructor(from, to, radii, angle, largeArcFlag, sweepFlag) {
    const radPerDeg = Math.PI / 180;
    this._segIndex = 0;
    this._numSegs = 0;
    if (from[0] == to[0] && from[1] == to[1]) {
      return;
    }
    this._rx = Math.abs(radii[0]);
    this._ry = Math.abs(radii[1]);
    this._sinPhi = Math.sin(angle * radPerDeg);
    this._cosPhi = Math.cos(angle * radPerDeg);
    var x1dash = this._cosPhi * (from[0] - to[0]) / 2.0 + this._sinPhi * (from[1] - to[1]) / 2.0;
    var y1dash = -this._sinPhi * (from[0] - to[0]) / 2.0 + this._cosPhi * (from[1] - to[1]) / 2.0;
    var root;
    var numerator = this._rx * this._rx * this._ry * this._ry - this._rx * this._rx * y1dash * y1dash - this._ry * this._ry * x1dash * x1dash;
    if (numerator < 0) {
      let s = Math.sqrt(1 - (numerator / (this._rx * this._rx * this._ry * this._ry)));
      this._rx = s;
      this._ry = s;
      root = 0;
    } else {
      root = (largeArcFlag == sweepFlag ? -1.0 : 1.0) *
        Math.sqrt(numerator / (this._rx * this._rx * y1dash * y1dash + this._ry * this._ry * x1dash * x1dash));
    }
    let cxdash = root * this._rx * y1dash / this._ry;
    let cydash = -root * this._ry * x1dash / this._rx;
    this._C = [0, 0];
    this._C[0] = this._cosPhi * cxdash - this._sinPhi * cydash + (from[0] + to[0]) / 2.0;
    this._C[1] = this._sinPhi * cxdash + this._cosPhi * cydash + (from[1] + to[1]) / 2.0;
    this._theta = this.calculateVectorAngle(1.0, 0.0, (x1dash - cxdash) / this._rx, (y1dash - cydash) / this._ry);
    let dtheta = this.calculateVectorAngle((x1dash - cxdash) / this._rx, (y1dash - cydash) / this._ry, (-x1dash - cxdash) / this._rx, (-y1dash - cydash) / this._ry);
    if ((!sweepFlag) && (dtheta > 0)) {
      dtheta -= 2 * Math.PI;
    } else if (sweepFlag && (dtheta < 0)) {
      dtheta += 2 * Math.PI;
    }
    this._numSegs = Math.ceil(Math.abs(dtheta / (Math.PI / 2)));
    this._delta = dtheta / this._numSegs;
    this._T = (8 / 3) * Math.sin(this._delta / 4) * Math.sin(this._delta / 4) / Math.sin(this._delta / 2);
    this._from = from;
  }

  getNextSegment() {
    var cp1, cp2, to;
    if (this._segIndex == this._numSegs) {
      return null;
    }
    let cosTheta1 = Math.cos(this._theta);
    let sinTheta1 = Math.sin(this._theta);
    let theta2 = this._theta + this._delta;
    let cosTheta2 = Math.cos(theta2);
    let sinTheta2 = Math.sin(theta2);

    to = [
      this._cosPhi * this._rx * cosTheta2 - this._sinPhi * this._ry * sinTheta2 + this._C[0],
      this._sinPhi * this._rx * cosTheta2 + this._cosPhi * this._ry * sinTheta2 + this._C[1]
    ];
    cp1 = [
      this._from[0] + this._T * (- this._cosPhi * this._rx * sinTheta1 - this._sinPhi * this._ry * cosTheta1),
      this._from[1] + this._T * (- this._sinPhi * this._rx * sinTheta1 + this._cosPhi * this._ry * cosTheta1)
    ];
    cp2 = [
      to[0] + this._T * (this._cosPhi * this._rx * sinTheta2 + this._sinPhi * this._ry * cosTheta2),
      to[1] + this._T * (this._sinPhi * this._rx * sinTheta2 - this._cosPhi * this._ry * cosTheta2)
    ];

    this._theta = theta2;
    this._from = [to[0], to[1]];
    this._segIndex++;

    return {
      cp1: cp1,
      cp2: cp2,
      to: to
    };
  }

  calculateVectorAngle(ux, uy, vx, vy) {
    let ta = Math.atan2(uy, ux);
    let tb = Math.atan2(vy, vx);
    if (tb >= ta)
      return tb - ta;
    return 2 * Math.PI - (ta - tb);
  }
}

class PathFitter {
  constructor(sets, closed) {
    this.sets = sets;
    this.closed = closed;
  }

  fit(simplification) {
    let outSets = [];
    for (const set of this.sets) {
      let length = set.length;
      let estLength = Math.floor(simplification * length);
      if (estLength < 5) {
        if (length <= 5) {
          continue;
        }
        estLength = 5;
      }
      outSets.push(this.reduce(set, estLength));
    }

    let d = '';
    for (const set of outSets) {
      for (let i = 0; i < set.length; i++) {
        let point = set[i];
        if (i === 0) {
          d += 'M' + point[0] + "," + point[1];
        } else {
          d += 'L' + point[0] + "," + point[1];
        }
      }
      if (this.closed) {
        d += 'z ';
      }
    }
    return d;
  }

  distance(p1, p2) {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
  }

  reduce(set, count) {
    if (set.length <= count) {
      return set;
    }
    let points = set.slice(0);
    while (points.length > count) {
      let minArea = -1;
      let minIndex = -1;
      for (let i = 1; i < (points.length - 1); i++) {
        let a = this.distance(points[i - 1], points[i]);
        let b = this.distance(points[i], points[i + 1]);
        let c = this.distance(points[i - 1], points[i + 1]);
        let s = (a + b + c) / 2.0;
        let area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        if ((minArea < 0) || (area < minArea)) {
          minArea = area;
          minIndex = i;
        }
      }
      if (minIndex > 0) {
        points.splice(minIndex, 1);
      } else {
        break;
      }
    }
    return points;
  }
}

class RoughRenderer {
  line(x1, y1, x2, y2, o) {
    let ops = this._doubleLine(x1, y1, x2, y2, o);
    return { type: 'path', ops };
  }

  linearPath(points, close, o) {
    const len = (points || []).length;
    if (len > 2) {
      let ops = [];
      for (let i = 0; i < (len - 1); i++) {
        ops = ops.concat(this._doubleLine(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], o));
      }
      if (close) {
        ops = ops.concat(this._doubleLine(points[len - 1][0], points[len - 1][1], points[0][0], points[0][1], o));
      }
      return { type: 'path', ops };
    } else if (len === 2) {
      return this.line(points[0][0], points[0][1], points[1][0], points[1][1], o);
    }
  }

  polygon(points, o) {
    return this.linearPath(points, true, o);
  }

  rectangle(x, y, width, height, o) {
    let points = [
      [x, y], [x + width, y], [x + width, y + height], [x, y + height]
    ];
    return this.polygon(points, o);
  }

  curve(points, o) {
    let o1 = this._curveWithOffset(points, 1 * (1 + o.roughness * 0.2), o);
    let o2 = this._curveWithOffset(points, 1.5 * (1 + o.roughness * 0.22), o);
    return { type: 'path', ops: o1.concat(o2) };
  }

  ellipse(x, y, width, height, o) {
    const increment = (Math.PI * 2) / o.curveStepCount;
    let rx = Math.abs(width / 2);
    let ry = Math.abs(height / 2);
    rx += this._getOffset(-rx * 0.05, rx * 0.05, o);
    ry += this._getOffset(-ry * 0.05, ry * 0.05, o);
    let o1 = this._ellipse(increment, x, y, rx, ry, 1, increment * this._getOffset(0.1, this._getOffset(0.4, 1, o), o), o);
    let o2 = this._ellipse(increment, x, y, rx, ry, 1.5, 0, o);
    return { type: 'path', ops: o1.concat(o2) };
  }

  arc(x, y, width, height, start, stop, closed, roughClosure, o) {
    let cx = x;
    let cy = y;
    let rx = Math.abs(width / 2);
    let ry = Math.abs(height / 2);
    rx += this._getOffset(-rx * 0.01, rx * 0.01, o);
    ry += this._getOffset(-ry * 0.01, ry * 0.01, o);
    let strt = start;
    let stp = stop;
    while (strt < 0) {
      strt += Math.PI * 2;
      stp += Math.PI * 2;
    }
    if ((stp - strt) > (Math.PI * 2)) {
      strt = 0;
      stp = Math.PI * 2;
    }
    let ellipseInc = (Math.PI * 2) / o.curveStepCount;
    let arcInc = Math.min(ellipseInc / 2, (stp - strt) / 2);
    let o1 = this._arc(arcInc, cx, cy, rx, ry, strt, stp, 1, o);
    let o2 = this._arc(arcInc, cx, cy, rx, ry, strt, stp, 1.5, o);
    let ops = o1.concat(o2);
    if (closed) {
      if (roughClosure) {
        ops = ops.concat(this._doubleLine(cx, cy, cx + rx * Math.cos(strt), cy + ry * Math.sin(strt), o));
        ops = ops.concat(this._doubleLine(cx, cy, cx + rx * Math.cos(stp), cy + ry * Math.sin(stp), o));
      } else {
        ops.push({ op: 'lineTo', data: [cx, cy] });
        ops.push({ op: 'lineTo', data: [cx + rx * Math.cos(strt), cy + ry * Math.sin(strt)] });
      }
    }
    return { type: 'path', ops };
  }

  hachureFillArc(x, y, width, height, start, stop, o) {
    let cx = x;
    let cy = y;
    let rx = Math.abs(width / 2);
    let ry = Math.abs(height / 2);
    rx += this._getOffset(-rx * 0.01, rx * 0.01, o);
    ry += this._getOffset(-ry * 0.01, ry * 0.01, o);
    let strt = start;
    let stp = stop;
    while (strt < 0) {
      strt += Math.PI * 2;
      stp += Math.PI * 2;
    }
    if ((stp - strt) > (Math.PI * 2)) {
      strt = 0;
      stp = Math.PI * 2;
    }
    let increment = (stp - strt) / o.curveStepCount;
    let xc = [], yc = [];
    for (let angle = strt; angle <= stp; angle = angle + increment) {
      xc.push(cx + rx * Math.cos(angle));
      yc.push(cy + ry * Math.sin(angle));
    }
    xc.push(cx + rx * Math.cos(stp));
    yc.push(cy + ry * Math.sin(stp));
    xc.push(cx);
    yc.push(cy);
    return this.hachureFillShape(xc, yc, o);
  }

  solidFillShape(xCoords, yCoords, o) {
    let ops = [];
    if (xCoords && yCoords && xCoords.length && yCoords.length && xCoords.length === yCoords.length) {
      let offset = o.maxRandomnessOffset || 0;
      const len = xCoords.length;
      if (len > 2) {
        ops.push({ op: 'move', data: [xCoords[0] + this._getOffset(-offset, offset, o), yCoords[0] + this._getOffset(-offset, offset, o)] });
        for (var i = 1; i < len; i++) {
          ops.push({ op: 'lineTo', data: [xCoords[i] + this._getOffset(-offset, offset, o), yCoords[i] + this._getOffset(-offset, offset, o)] });
        }
      }
    }
    return { type: 'fillPath', ops };
  }

  hachureFillShape(xCoords, yCoords, o) {
    let ops = [];
    if (xCoords && yCoords && xCoords.length && yCoords.length) {
      let left = xCoords[0];
      let right = xCoords[0];
      let top = yCoords[0];
      let bottom = yCoords[0];
      for (let i = 1; i < xCoords.length; i++) {
        left = Math.min(left, xCoords[i]);
        right = Math.max(right, xCoords[i]);
        top = Math.min(top, yCoords[i]);
        bottom = Math.max(bottom, yCoords[i]);
      }
      const angle = o.hachureAngle;
      let gap = o.hachureGap;
      if (gap < 0) {
        gap = o.strokeWidth * 4;
      }
      gap = Math.max(gap, 0.1);

      const radPerDeg = Math.PI / 180;
      const hachureAngle = (angle % 180) * radPerDeg;
      const cosAngle = Math.cos(hachureAngle);
      const sinAngle = Math.sin(hachureAngle);
      const tanAngle = Math.tan(hachureAngle);

      const it = new RoughHachureIterator(top - 1, bottom + 1, left - 1, right + 1, gap, sinAngle, cosAngle, tanAngle);
      let rectCoords;
      while ((rectCoords = it.getNextLine()) != null) {
        let lines = this._getIntersectingLines(rectCoords, xCoords, yCoords);
        for (let i = 0; i < lines.length; i++) {
          if (i < (lines.length - 1)) {
            let p1 = lines[i];
            let p2 = lines[i + 1];
            ops = ops.concat(this._doubleLine(p1[0], p1[1], p2[0], p2[1], o));
          }
        }
      }
    }
    return { type: 'path', ops };
  }

  hachureFillEllipse(cx, cy, width, height, o) {
    let ops = [];
    let rx = Math.abs(width / 2);
    let ry = Math.abs(height / 2);
    rx += this._getOffset(-rx * 0.05, rx * 0.05, o);
    ry += this._getOffset(-ry * 0.05, ry * 0.05, o);
    let angle = o.hachureAngle;
    let gap = o.hachureGap;
    if (gap <= 0) {
      gap = o.strokeWidth * 4;
    }
    let fweight = o.fillWeight;
    if (fweight < 0) {
      fweight = o.strokeWidth / 2;
    }
    const radPerDeg = Math.PI / 180;
    let hachureAngle = (angle % 180) * radPerDeg;
    let tanAngle = Math.tan(hachureAngle);
    let aspectRatio = ry / rx;
    let hyp = Math.sqrt(aspectRatio * tanAngle * aspectRatio * tanAngle + 1);
    let sinAnglePrime = aspectRatio * tanAngle / hyp;
    let cosAnglePrime = 1 / hyp;
    let gapPrime = gap / ((rx * ry / Math.sqrt((ry * cosAnglePrime) * (ry * cosAnglePrime) + (rx * sinAnglePrime) * (rx * sinAnglePrime))) / rx);
    let halfLen = Math.sqrt((rx * rx) - (cx - rx + gapPrime) * (cx - rx + gapPrime));
    for (var xPos = cx - rx + gapPrime; xPos < cx + rx; xPos += gapPrime) {
      halfLen = Math.sqrt((rx * rx) - (cx - xPos) * (cx - xPos));
      let p1 = this._affine(xPos, cy - halfLen, cx, cy, sinAnglePrime, cosAnglePrime, aspectRatio);
      let p2 = this._affine(xPos, cy + halfLen, cx, cy, sinAnglePrime, cosAnglePrime, aspectRatio);
      ops = ops.concat(this._doubleLine(p1[0], p1[1], p2[0], p2[1], o));
    }
    return { type: 'path', ops };
  }

  svgPath(path, o) {
    path = (path || '').replace(/\n/g, " ").replace(/(-)/g, " -").replace(/(-\s)/g, "-").replace("/(\s\s)/g", " ");
    let p = new RoughPath(path);
    if (o.simplification) {
      let fitter = new PathFitter(p.linearPoints, p.closed);
      let d = fitter.fit(o.simplification);
      p = new RoughPath(d);
    }
    let ops = [];
    let segments = p.segments || [];
    for (let i = 0; i < segments.length; i++) {
      let s = segments[i];
      let prev = i > 0 ? segments[i - 1] : null;
      let opList = this._processSegment(p, s, prev, o);
      if (opList && opList.length) {
        ops = ops.concat(opList);
      }
    }
    return { type: 'path', ops };
  }

  // privates

  _bezierTo(x1, y1, x2, y2, x, y, path, o) {
    let ops = [];
    let ros = [o.maxRandomnessOffset || 1, (o.maxRandomnessOffset || 1) + 0.5];
    let f = null;
    for (let i = 0; i < 2; i++) {
      if (i === 0) {
        ops.push({ op: 'move', data: [path.x, path.y] });
      } else {
        ops.push({ op: 'move', data: [path.x + this._getOffset(-ros[0], ros[0], o), path.y + this._getOffset(-ros[0], ros[0], o)] });
      }
      f = [x + this._getOffset(-ros[i], ros[i], o), y + this._getOffset(-ros[i], ros[i], o)];
      ops.push({
        op: 'bcurveTo', data: [
          x1 + this._getOffset(-ros[i], ros[i], o), y1 + this._getOffset(-ros[i], ros[i], o),
          x2 + this._getOffset(-ros[i], ros[i], o), y2 + this._getOffset(-ros[i], ros[i], o),
          f[0], f[1]
        ]
      });
    }
    path.setPosition(f[0], f[1]);
    return ops;
  }

  _processSegment(path, seg, prevSeg, o) {
    let ops = [];
    switch (seg.key) {
      case 'M':
      case 'm': {
        let delta = seg.key === 'm';
        if (seg.data.length >= 2) {
          let x = +seg.data[0];
          let y = +seg.data[1];
          if (delta) {
            x += path.x;
            y += path.y;
          }
          let ro = 1 * (o.maxRandomnessOffset || 0);
          x = x + this._getOffset(-ro, ro, o);
          y = y + this._getOffset(-ro, ro, o);
          path.setPosition(x, y);
          ops.push({ op: 'move', data: [x, y] });
        }
        break;
      }
      case 'L':
      case 'l': {
        let delta = seg.key === 'l';
        if (seg.data.length >= 2) {
          let x = +seg.data[0];
          let y = +seg.data[1];
          if (delta) {
            x += path.x;
            y += path.y;
          }
          ops = ops.concat(this._doubleLine(path.x, path.y, x, y, o));
          path.setPosition(x, y);
        }
        break;
      }
      case 'H':
      case 'h': {
        const delta = seg.key === 'h';
        if (seg.data.length) {
          let x = +seg.data[0];
          if (delta) {
            x += path.x;
          }
          ops = ops.concat(this._doubleLine(path.x, path.y, x, path.y, o));
          path.setPosition(x, path.y);
        }
        break;
      }
      case 'V':
      case 'v': {
        const delta = seg.key === 'v';
        if (seg.data.length) {
          let y = +seg.data[0];
          if (delta) {
            y += path.y;
          }
          ops = ops.concat(this._doubleLine(path.x, path.y, path.x, y, o));
          path.setPosition(path.x, y);
        }
        break;
      }
      case 'Z':
      case 'z': {
        if (path.first) {
          ops = ops.concat(this._doubleLine(path.x, path.y, path.first[0], path.first[1], o));
          path.setPosition(path.first[0], path.first[1]);
          path.first = null;
        }
        break;
      }
      case 'C':
      case 'c': {
        const delta = seg.key === 'c';
        if (seg.data.length >= 6) {
          let x1 = +seg.data[0];
          let y1 = +seg.data[1];
          let x2 = +seg.data[2];
          let y2 = +seg.data[3];
          let x = +seg.data[4];
          let y = +seg.data[5];
          if (delta) {
            x1 += path.x;
            x2 += path.x;
            x += path.x;
            y1 += path.y;
            y2 += path.y;
            y += path.y;
          }
          let ob = this._bezierTo(x1, y1, x2, y2, x, y, path, o);
          ops = ops.concat(ob);
          path.bezierReflectionPoint = [x + (x - x2), y + (y - y2)];
        }
        break;
      }
      case 'S':
      case 's': {
        const delta = seg.key === 's';
        if (seg.data.length >= 4) {
          let x2 = +seg.data[0];
          let y2 = +seg.data[1];
          let x = +seg.data[2];
          let y = +seg.data[3];
          if (delta) {
            x2 += path.x;
            x += path.x;
            y2 += path.y;
            y += path.y;
          }
          let x1 = x2;
          let y1 = y2;
          let prevKey = prevSeg ? prevSeg.key : "";
          var ref = null;
          if (prevKey == 'c' || prevKey == 'C' || prevKey == 's' || prevKey == 'S') {
            ref = path.bezierReflectionPoint;
          }
          if (ref) {
            x1 = ref[0];
            y1 = ref[1];
          }
          let ob = this._bezierTo(x1, y1, x2, y2, x, y, path, o);
          ops = ops.concat(ob);
          path.bezierReflectionPoint = [x + (x - x2), y + (y - y2)];
        }
        break;
      }
      case 'Q':
      case 'q': {
        const delta = seg.key === 'q';
        if (seg.data.length >= 4) {
          let x1 = +seg.data[0];
          let y1 = +seg.data[1];
          let x = +seg.data[2];
          let y = +seg.data[3];
          if (delta) {
            x1 += path.x;
            x += path.x;
            y1 += path.y;
            y += path.y;
          }
          let offset1 = 1 * (1 + o.roughness * 0.2);
          let offset2 = 1.5 * (1 + o.roughness * 0.22);
          ops.push({ op: 'move', data: [path.x + this._getOffset(-offset1, offset1, o), path.y + this._getOffset(-offset1, offset1, o)] });
          let f = [x + this._getOffset(-offset1, offset1, o), y + this._getOffset(-offset1, offset1, o)];
          ops.push({
            op: 'qcurveTo', data: [
              x1 + this._getOffset(-offset1, offset1, o), y1 + this._getOffset(-offset1, offset1, o),
              f[0], f[1]
            ]
          });
          ops.push({ op: 'move', data: [path.x + this._getOffset(-offset2, offset2, o), path.y + this._getOffset(-offset2, offset2, o)] });
          f = [x + this._getOffset(-offset2, offset2, o), y + this._getOffset(-offset2, offset2, o)];
          ops.push({
            op: 'qcurveTo', data: [
              x1 + this._getOffset(-offset2, offset2, o), y1 + this._getOffset(-offset2, offset2, o),
              f[0], f[1]
            ]
          });
          path.setPosition(f[0], f[1]);
          path.quadReflectionPoint = [x + (x - x1), y + (y - y1)];
        }
        break;
      }
      case 'T':
      case 't': {
        const delta = seg.key === 't';
        if (seg.data.length >= 2) {
          let x = +seg.data[0];
          let y = +seg.data[1];
          if (delta) {
            x += path.x;
            y += path.y;
          }
          let x1 = x;
          let y1 = y;
          let prevKey = prevSeg ? prevSeg.key : "";
          var ref = null;
          if (prevKey == 'q' || prevKey == 'Q' || prevKey == 't' || prevKey == 'T') {
            ref = path.quadReflectionPoint;
          }
          if (ref) {
            x1 = ref[0];
            y1 = ref[1];
          }
          let offset1 = 1 * (1 + o.roughness * 0.2);
          let offset2 = 1.5 * (1 + o.roughness * 0.22);
          ops.push({ op: 'move', data: [path.x + this._getOffset(-offset1, offset1, o), path.y + this._getOffset(-offset1, offset1, o)] });
          let f = [x + this._getOffset(-offset1, offset1, o), y + this._getOffset(-offset1, offset1, o)];
          ops.push({
            op: 'qcurveTo', data: [
              x1 + this._getOffset(-offset1, offset1, o), y1 + this._getOffset(-offset1, offset1, o),
              f[0], f[1]
            ]
          });
          ops.push({ op: 'move', data: [path.x + this._getOffset(-offset2, offset2, o), path.y + this._getOffset(-offset2, offset2, o)] });
          f = [x + this._getOffset(-offset2, offset2, o), y + this._getOffset(-offset2, offset2, o)];
          ops.push({
            op: 'qcurveTo', data: [
              x1 + this._getOffset(-offset2, offset2, o), y1 + this._getOffset(-offset2, offset2, o),
              f[0], f[1]
            ]
          });
          path.setPosition(f[0], f[1]);
          path.quadReflectionPoint = [x + (x - x1), y + (y - y1)];
        }
        break;
      }
      case 'A':
      case 'a': {
        const delta = seg.key === 'a';
        if (seg.data.length >= 7) {
          let rx = +seg.data[0];
          let ry = +seg.data[1];
          let angle = +seg.data[2];
          let largeArcFlag = +seg.data[3];
          let sweepFlag = +seg.data[4];
          let x = +seg.data[5];
          let y = +seg.data[6];
          if (delta) {
            x += path.x;
            y += path.y;
          }
          if (x == path.x && y == path.y) {
            break;
          }
          if (rx == 0 || ry == 0) {
            ops = ops.concat(this._doubleLine(path.x, path.y, x, y, o));
            path.setPosition(x, y);
          } else {
            let ro = o.maxRandomnessOffset || 0;
            for (let i = 0; i < 1; i++) {
              let arcConverter = new RoughArcConverter(
                [path.x, path.y],
                [x, y],
                [rx, ry],
                angle,
                largeArcFlag ? true : false,
                sweepFlag ? true : false
              );
              let segment = arcConverter.getNextSegment();
              while (segment) {
                let ob = this._bezierTo(segment.cp1[0], segment.cp1[1], segment.cp2[0], segment.cp2[1], segment.to[0], segment.to[1], path, o);
                ops = ops.concat(ob);
                segment = arcConverter.getNextSegment();
              }
            }
          }
        }
        break;
      }
      default:
        break;
    }
    return ops;
  }

  _getOffset(min, max, ops) {
    return ops.roughness * ((Math.random() * (max - min)) + min);
  }

  _affine(x, y, cx, cy, sinAnglePrime, cosAnglePrime, R) {
    var A = -cx * cosAnglePrime - cy * sinAnglePrime + cx;
    var B = R * (cx * sinAnglePrime - cy * cosAnglePrime) + cy;
    var C = cosAnglePrime;
    var D = sinAnglePrime;
    var E = -R * sinAnglePrime;
    var F = R * cosAnglePrime;
    return [
      A + C * x + D * y,
      B + E * x + F * y
    ];
  }

  _doubleLine(x1, y1, x2, y2, o) {
    const o1 = this._line(x1, y1, x2, y2, o, true, false);
    const o2 = this._line(x1, y1, x2, y2, o, true, true);
    return o1.concat(o2);
  }

  _line(x1, y1, x2, y2, o, move, overlay) {
    const lengthSq = Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2);
    let offset = o.maxRandomnessOffset || 0;
    if ((offset * offset * 100) > lengthSq) {
      offset = Math.sqrt(lengthSq) / 10;
    }
    const halfOffset = offset / 2;
    const divergePoint = 0.2 + Math.random() * 0.2;
    let midDispX = o.bowing * o.maxRandomnessOffset * (y2 - y1) / 200;
    let midDispY = o.bowing * o.maxRandomnessOffset * (x2) / 200;
    midDispX = this._getOffset(-midDispX, midDispX, o);
    midDispY = this._getOffset(-midDispY, midDispY, o);
    let ops = [];
    if (move) {
      if (overlay) {
        ops.push({
          op: 'move', data: [
            x1 + this._getOffset(-halfOffset, halfOffset, o),
            y1 + this._getOffset(-halfOffset, halfOffset, o)
          ]
        });
      } else {
        ops.push({
          op: 'move', data: [
            x1 + this._getOffset(-offset, offset, o),
            y1 + this._getOffset(-offset, offset, o)
          ]
        });
      }
    }
    if (overlay) {
      ops.push({
        op: 'bcurveTo', data: [
          midDispX + x1 + (x2 - x1) * divergePoint + this._getOffset(-halfOffset, halfOffset, o),
          midDispY + y1 + (y2 - y1) * divergePoint + this._getOffset(-halfOffset, halfOffset, o),
          midDispX + x1 + 2 * (x2 - x1) * divergePoint + this._getOffset(-halfOffset, halfOffset, o),
          midDispY + y1 + 2 * (y2 - y1) * divergePoint + this._getOffset(-halfOffset, halfOffset, o),
          x2 + this._getOffset(-halfOffset, halfOffset, o),
          y2 + this._getOffset(-halfOffset, halfOffset, o)
        ]
      });
    } else {
      ops.push({
        op: 'bcurveTo', data: [
          midDispX + x1 + (x2 - x1) * divergePoint + this._getOffset(-offset, offset, o),
          midDispY + y1 + (y2 - y1) * divergePoint + this._getOffset(-offset, offset, o),
          midDispX + x1 + 2 * (x2 - x1) * divergePoint + this._getOffset(-offset, offset, o),
          midDispY + y1 + 2 * (y2 - y1) * divergePoint + this._getOffset(-offset, offset, o),
          x2 + this._getOffset(-offset, offset, o),
          y2 + this._getOffset(-offset, offset, o)
        ]
      });
    }
    return ops;
  }

  _curve(points, closePoint, o) {
    const len = points.length;
    let ops = [];
    if (len > 3) {
      const b = [];
      const s = 1 - o.curveTightness;
      ops.push({ op: 'move', data: [points[1][0], points[1][1]] });
      for (let i = 1; (i + 2) < len; i++) {
        const cachedVertArray = points[i];
        b[0] = [cachedVertArray[0], cachedVertArray[1]];
        b[1] = [cachedVertArray[0] + (s * points[i + 1][0] - s * points[i - 1][0]) / 6, cachedVertArray[1] + (s * points[i + 1][1] - s * points[i - 1][1]) / 6];
        b[2] = [points[i + 1][0] + (s * points[i][0] - s * points[i + 2][0]) / 6, points[i + 1][1] + (s * points[i][1] - s * points[i + 2][1]) / 6];
        b[3] = [points[i + 1][0], points[i + 1][1]];
        ops.push({ op: 'bcurveTo', data: [b[1][0], b[1][1], b[2][0], b[2][1], b[3][0], b[3][1]] });
      }
      if (closePoint && closePoint.length === 2) {
        let ro = o.maxRandomnessOffset;
        // TODO: more roughness here?
        ops.push({ ops: 'lineTo', data: [closePoint[0] + this._getOffset(-ro, ro, o), closePoint[1] + + this._getOffset(-ro, ro, o)] });
      }
    } else if (len === 3) {
      ops.push({ op: 'move', data: [points[1][0], points[1][1]] });
      ops.push({
        op: 'bcurveTo', data: [
          points[1][0], points[1][1],
          points[2][0], points[2][1],
          points[2][0], points[2][1]]
      });
    } else if (len === 2) {
      ops = ops.concat(this._doubleLine(points[0][0], points[0][1], points[1][0], points[1][1], o));
    }
    return ops;
  }

  _ellipse(increment, cx, cy, rx, ry, offset, overlap, o) {
    const radOffset = this._getOffset(-0.5, 0.5, o) - (Math.PI / 2);
    const points = [];
    points.push([
      this._getOffset(-offset, offset, o) + cx + 0.9 * rx * Math.cos(radOffset - increment),
      this._getOffset(-offset, offset, o) + cy + 0.9 * ry * Math.sin(radOffset - increment)
    ]);
    for (let angle = radOffset; angle < (Math.PI * 2 + radOffset - 0.01); angle = angle + increment) {
      points.push([
        this._getOffset(-offset, offset, o) + cx + rx * Math.cos(angle),
        this._getOffset(-offset, offset, o) + cy + ry * Math.sin(angle)
      ]);
    }
    points.push([
      this._getOffset(-offset, offset, o) + cx + rx * Math.cos(radOffset + Math.PI * 2 + overlap * 0.5),
      this._getOffset(-offset, offset, o) + cy + ry * Math.sin(radOffset + Math.PI * 2 + overlap * 0.5)
    ]);
    points.push([
      this._getOffset(-offset, offset, o) + cx + 0.98 * rx * Math.cos(radOffset + overlap),
      this._getOffset(-offset, offset, o) + cy + 0.98 * ry * Math.sin(radOffset + overlap)
    ]);
    points.push([
      this._getOffset(-offset, offset, o) + cx + 0.9 * rx * Math.cos(radOffset + overlap * 0.5),
      this._getOffset(-offset, offset, o) + cy + 0.9 * ry * Math.sin(radOffset + overlap * 0.5)
    ]);
    return this._curve(points, null, o);
  }

  _curveWithOffset(points, offset, o) {
    const ps = [];
    ps.push([
      points[0][0] + this._getOffset(-offset, offset, o),
      points[0][1] + this._getOffset(-offset, offset, o),
    ]);
    ps.push([
      points[0][0] + this._getOffset(-offset, offset, o),
      points[0][1] + this._getOffset(-offset, offset, o),
    ]);
    for (let i = 1; i < points.length; i++) {
      ps.push([
        points[i][0] + this._getOffset(-offset, offset, o),
        points[i][1] + this._getOffset(-offset, offset, o),
      ]);
      if (i === (points.length - 1)) {
        ps.push([
          points[i][0] + this._getOffset(-offset, offset, o),
          points[i][1] + this._getOffset(-offset, offset, o),
        ]);
      }
    }
    return this._curve(ps, null, o);
  }

  _arc(increment, cx, cy, rx, ry, strt, stp, offset, o) {
    const radOffset = strt + this._getOffset(-0.1, 0.1, o);
    const points = [];
    points.push([
      this._getOffset(-offset, offset, o) + cx + 0.9 * rx * Math.cos(radOffset - increment),
      this._getOffset(-offset, offset, o) + cy + 0.9 * ry * Math.sin(radOffset - increment)
    ]);
    for (let angle = radOffset; angle <= stp; angle = angle + increment) {
      points.push([
        this._getOffset(-offset, offset, o) + cx + rx * Math.cos(angle),
        this._getOffset(-offset, offset, o) + cy + ry * Math.sin(angle)
      ]);
    }
    points.push([
      cx + rx * Math.cos(stp),
      cy + ry * Math.sin(stp)
    ]);
    points.push([
      cx + rx * Math.cos(stp),
      cy + ry * Math.sin(stp)
    ]);
    return this._curve(points, null, o);
  }

  _getIntersectingLines(lineCoords, xCoords, yCoords) {
    let intersections = [];
    var s1 = new RoughSegment(lineCoords[0], lineCoords[1], lineCoords[2], lineCoords[3]);
    for (var i = 0; i < xCoords.length; i++) {
      let s2 = new RoughSegment(xCoords[i], yCoords[i], xCoords[(i + 1) % xCoords.length], yCoords[(i + 1) % xCoords.length]);
      if (s1.compare(s2) == RoughSegmentRelation().INTERSECTS) {
        intersections.push([s1.xi, s1.yi]);
      }
    }
    return intersections;
  }
}

self._roughScript = self.document && self.document.currentScript && self.document.currentScript.src;

class RoughCanvas {
  constructor(canvas, config) {
    this.config = config || {};
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");
    this.defaultOptions = {
      maxRandomnessOffset: 2,
      roughness: 1,
      bowing: 1,
      stroke: '#000',
      strokeWidth: 1,
      curveTightness: 0,
      curveStepCount: 9,
      fill: null,
      fillStyle: 'hachure',
      fillWeight: -1,
      hachureAngle: -41,
      hachureGap: -1
    };
    if (this.config.options) {
      this.defaultOptions = this._options(this.config.options);
    }
  }

  static createRenderer() {
    return new RoughRenderer();
  }

  async lib() {
    if (!this._renderer) {
      if (window.workly && (!this.config.noWorker)) {
        const tos = Function.prototype.toString;
        const worklySource = this.config.worklyURL || 'https://cdn.jsdelivr.net/gh/pshihn/workly/dist/workly.min.js';
        const rendererSource = this.config.roughURL || self._roughScript;
        if (rendererSource && worklySource) {
          let code = `importScripts('${worklySource}', '${rendererSource}');\nworkly.expose(self.rough.createRenderer());`;
          let ourl = URL.createObjectURL(new Blob([code]));
          this._renderer = workly.proxy(ourl);
        } else {
          this._renderer = new RoughRenderer();
        }
      } else {
        this._renderer = new RoughRenderer();
      }
    }
    return this._renderer;
  }

  async line(x1, y1, x2, y2, options) {
    let o = this._options(options);
    let lib = await this.lib();
    let drawing = await lib.line(x1, y1, x2, y2, o);
    this._draw(this.ctx, drawing, o);
  }

  async rectangle(x, y, width, height, options) {
    let o = this._options(options);
    let lib = await this.lib();
    if (o.fill) {
      let ctx = this.ctx;
      const xc = [x, x + width, x + width, x];
      const yc = [y, y, y + height, y + height];
      if (o.fillStyle === 'solid') {
        let fillShape = await lib.solidFillShape(xc, yc, o);
        this._fill(ctx, fillShape, o);
      } else {
        let fillShape = await lib.hachureFillShape(xc, yc, o);
        this._fillSketch(ctx, fillShape, o);
      }
    }
    let drawing = await lib.rectangle(x, y, width, height, o);
    this._draw(this.ctx, drawing, o);
  }

  async ellipse(x, y, width, height, options) {
    let o = this._options(options);
    let lib = await this.lib();
    if (o.fill) {
      if (o.fillStyle === 'solid') {
        let fillShape = await lib.ellipse(x, y, width, height, o);
        this._fill(this.ctx, fillShape, o);
      } else {
        let fillShape = await lib.hachureFillEllipse(x, y, width, height, o);
        this._fillSketch(this.ctx, fillShape, o);
      }
    }
    let drawing = await lib.ellipse(x, y, width, height, o);
    this._draw(this.ctx, drawing, o);
  }

  async circle(x, y, radius, options) {
    return await this.ellipse(x, y, radius, radius, options);
  }

  async linearPath(points, options) {
    let o = this._options(options);
    let lib = await this.lib();
    let drawing = await lib.linearPath(points, false, o);
    this._draw(this.ctx, drawing, o);
  }

  async polygon(points, options) {
    let o = this._options(options);
    let lib = await this.lib();
    if (o.fill) {
      let xc = [], yc = [];
      for (let p of points) {
        xc.push(p[0]);
        yc.push(p[1]);
      }
      if (o.fillStyle === 'solid') {
        let fillShape = await lib.solidFillShape(xc, yc, o);
        this._fill(this.ctx, fillShape, o);
      } else {
        let fillShape = await lib.hachureFillShape(xc, yc, o);
        this._fillSketch(this.ctx, fillShape, o);
      }
    }
    let drawing = await lib.linearPath(points, true, o);
    this._draw(this.ctx, drawing, o);
  }

  async arc(x, y, width, height, start, stop, closed, options) {
    let o = this._options(options);
    let lib = await this.lib();
    if (closed && o.fill) {
      if (o.fillStyle === 'solid') {
        let fillShape = await lib.arc(x, y, width, height, start, stop, true, false, o);
        this._fill(this.ctx, fillShape, o);
      } else {
        let fillShape = await lib.hachureFillArc(x, y, width, height, start, stop, o);
        this._fillSketch(this.ctx, fillShape, o);
      }
    }
    let drawing = await lib.arc(x, y, width, height, start, stop, closed, true, o);
    this._draw(this.ctx, drawing, o);
  }

  async curve(points, options) {
    let o = this._options(options);
    let lib = await this.lib();
    let drawing = await lib.curve(points, o);
    this._draw(this.ctx, drawing, o);
  }

  async path(d, options) {
    if (!d) {
      return;
    }
    let o = this._options(options);
    let lib = await this.lib();
    if (o.fill) {
      if (o.fillStyle === 'solid') {
        this.ctx.save();
        this.ctx.fillStyle = o.fill;
        let p2d = new Path2D(d);
        this.ctx.fill(p2d);
        this.ctx.restore();
      } else {
        let size = [0, 0];
        try {
          const ns = "http://www.w3.org/2000/svg";
          let svg = document.createElementNS(ns, "svg");
          svg.setAttribute("width", "0");
          svg.setAttribute("height", "0");
          let pathNode = document.createElementNS(ns, "path");
          pathNode.setAttribute('d', d);
          svg.appendChild(pathNode);
          document.body.appendChild(svg);
          let bb = pathNode.getBBox();
          if (bb) {
            size[0] = bb.width || 0;
            size[1] = bb.height || 0;
          }
          document.body.removeChild(svg);
        } catch (err) { }
        if (!(size[0] * size[1])) {
          size = [this.canvas.width || 100, this.canvas.height || 100];
        }
        size[0] = Math.min(size[0] * 4, this.canvas.width);
        size[1] = Math.min(size[1] * 4, this.canvas.height);
        let xc = [0, size[0], size[0], 0];
        let yc = [0, 0, size[1], size[1]];
        let fillShape = await lib.hachureFillShape(xc, yc, o);
        let hcanvas = document.createElement('canvas');
        hcanvas.width = size[0];
        hcanvas.height = size[1];
        this._fillSketch(hcanvas.getContext("2d"), fillShape, o);
        this.ctx.save();
        this.ctx.fillStyle = this.ctx.createPattern(hcanvas, 'repeat');
        let p2d = new Path2D(d);
        this.ctx.fill(p2d);
        this.ctx.restore();
      }
    }
    let drawing = await lib.svgPath(d, o);
    this._draw(this.ctx, drawing, o);
  }

  // private

  _options(options) {
    return options ? Object.assign({}, this.defaultOptions, options) : this.defaultOptions;
  }

  _draw(ctx, drawing, o) {
    ctx.save();
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.strokeWidth;
    this._drawToContext(ctx, drawing);
    ctx.restore();
  }

  _fillSketch(ctx, drawing, o) {
    let fweight = o.fillWeight;
    if (fweight < 0) {
      fweight = o.strokeWidth / 2;
    }
    ctx.save();
    ctx.strokeStyle = o.fill;
    ctx.lineWidth = fweight;
    this._drawToContext(ctx, drawing);
    ctx.restore();
  }

  _fill(ctx, drawing, o) {
    ctx.save();
    ctx.fillStyle = o.fill;
    drawing.type = 'fillPath';
    this._drawToContext(ctx, drawing, o);
    ctx.restore();
  }

  _drawToContext(ctx, drawing) {
    if (drawing.type === 'path' || drawing.type === 'fillPath') {
      ctx.beginPath();
      for (let item of drawing.ops) {
        const data = item.data;
        switch (item.op) {
          case 'move':
            ctx.moveTo(data[0], data[1]);
            break;
          case 'bcurveTo':
            ctx.bezierCurveTo(data[0], data[1], data[2], data[3], data[4], data[5]);
            break;
          case 'qcurveTo':
            ctx.quadraticCurveTo(data[0], data[1], data[2], data[3]);
            break;
          case 'lineTo':
            ctx.lineTo(data[0], data[1]);
            break;
        }
      }
      if (drawing.type === 'fillPath') {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
  }
}

var rough = {
  canvas(canvas, config) {
    return new RoughCanvas(canvas, config);
  },
  createRenderer() {
    return RoughCanvas.createRenderer();
  }
};

var RoughCanvas$1 = L.Canvas.extend({
	_initContainer: function () {

		L.Canvas.prototype._initContainer.call(this);
		this._rc = rough.canvas(this._container);
	},

	_updatePoly: function (layer, closed) {


		if (!this._drawing) { return; }

		var parts = layer._parts,
			len = parts.length,
			ctx = this._ctx;

		if (!len) { return; }

		this._drawnLayers[layer._leaflet_id] = layer;


		//------------------------ rough sketch begin

		var svgPathStr = L.SVG.pointsToPath(parts, closed);
		console.log(closed);

		var options = layer.options;
		var pathOption = {};


		pathOption.roughness = options.roughness || 1;
		pathOption.bowing = options.bowing || 1;
		pathOption.stroke = options.strokeColor || '#000000';
		pathOption.strokeWidth = options.strokeWidth || 1;
		if (closed) {
			pathOption.fill = options.fillColor || options.color;
			pathOption.fillStyle = options.fillStyle || '';
			pathOption.fillWeight = options.fillWeight || '';
			pathOption.hachureAngle = options.hachureAngle || -41;
			pathOption.hachureGap = options.hachureGap || 4;
			// pathOption.simplification = options.simplification || 1;
		}
		pathOption.curveStepCount = options.curveStepCount || 9;
		
		console.log(pathOption);
		this._rc.path(svgPathStr, pathOption);

		// //----------------------------- rough sketch end

	},
});

L.Canvas.RoughCanvas = RoughCanvas$1;

L.Canvas.roughCanvas = () => {
	return new RoughCanvas$1()
};

})));
//# sourceMappingURL=leaflet-roughcanvas.js.map

/*! svg.js v2.6.4 MIT*/;!function(t,e){"function"==typeof define&&define.amd?define(function(){return e(t,t.document)}):"object"==typeof exports?module.exports=t.document?e(t,t.document):function(t){return e(t,t.document)}:t.SVG=e(t,t.document)}("undefined"!=typeof window?window:this,function(t,e){function i(t,e,i,n){return i+n.replace(w.regex.dots," .")}function n(t){for(var e=t.slice(0),i=e.length;i--;)Array.isArray(e[i])&&(e[i]=n(e[i]));return e}function r(t,e){return t instanceof e}function s(t,e){return(t.matches||t.matchesSelector||t.msMatchesSelector||t.mozMatchesSelector||t.webkitMatchesSelector||t.oMatchesSelector).call(t,e)}function o(t){return t.toLowerCase().replace(/-(.)/g,function(t,e){return e.toUpperCase()})}function a(t){return t.charAt(0).toUpperCase()+t.slice(1)}function h(t){return 4==t.length?["#",t.substring(1,2),t.substring(1,2),t.substring(2,3),t.substring(2,3),t.substring(3,4),t.substring(3,4)].join(""):t}function u(t){var e=t.toString(16);return 1==e.length?"0"+e:e}function l(t,e,i){if(null==e||null==i){var n=t.bbox();null==e?e=n.width/n.height*i:null==i&&(i=n.height/n.width*e)}return{width:e,height:i}}function c(t,e,i){return{x:e*t.a+i*t.c+0,y:e*t.b+i*t.d+0}}function f(t){return{a:t[0],b:t[1],c:t[2],d:t[3],e:t[4],f:t[5]}}function d(t){return t instanceof w.Matrix||(t=new w.Matrix(t)),t}function p(t,e){t.cx=null==t.cx?e.bbox().cx:t.cx,t.cy=null==t.cy?e.bbox().cy:t.cy}function m(t){for(var e=0,i=t.length,n="";e<i;e++)n+=t[e][0],null!=t[e][1]&&(n+=t[e][1],null!=t[e][2]&&(n+=" ",n+=t[e][2],null!=t[e][3]&&(n+=" ",n+=t[e][3],n+=" ",n+=t[e][4],null!=t[e][5]&&(n+=" ",n+=t[e][5],n+=" ",n+=t[e][6],null!=t[e][7]&&(n+=" ",n+=t[e][7])))));return n+" "}function x(e){for(var i=e.childNodes.length-1;i>=0;i--)e.childNodes[i]instanceof t.SVGElement&&x(e.childNodes[i]);return w.adopt(e).id(w.eid(e.nodeName))}function y(t){return null==t.x&&(t.x=0,t.y=0,t.width=0,t.height=0),t.w=t.width,t.h=t.height,t.x2=t.x+t.width,t.y2=t.y+t.height,t.cx=t.x+t.width/2,t.cy=t.y+t.height/2,t}function v(t){var e=t.toString().match(w.regex.reference);if(e)return e[1]}function g(t){return Math.abs(t)>1e-37?t:0}var w=this.SVG=function(t){if(w.supported)return t=new w.Doc(t),w.parser.draw||w.prepare(),t};if(w.ns="http://www.w3.org/2000/svg",w.xmlns="http://www.w3.org/2000/xmlns/",w.xlink="http://www.w3.org/1999/xlink",w.svgjs="http://svgjs.com/svgjs",w.supported=function(){return!!e.createElementNS&&!!e.createElementNS(w.ns,"svg").createSVGRect}(),!w.supported)return!1;w.did=1e3,w.eid=function(t){return"Svgjs"+a(t)+w.did++},w.create=function(t){var i=e.createElementNS(this.ns,t);return i.setAttribute("id",this.eid(t)),i},w.extend=function(){var t,e,i,n;for(t=[].slice.call(arguments),e=t.pop(),n=t.length-1;n>=0;n--)if(t[n])for(i in e)t[n].prototype[i]=e[i];w.Set&&w.Set.inherit&&w.Set.inherit()},w.invent=function(t){var e="function"==typeof t.create?t.create:function(){this.constructor.call(this,w.create(t.create))};return t.inherit&&(e.prototype=new t.inherit),t.extend&&w.extend(e,t.extend),t.construct&&w.extend(t.parent||w.Container,t.construct),e},w.adopt=function(e){if(!e)return null;if(e.instance)return e.instance;var i;return i="svg"==e.nodeName?e.parentNode instanceof t.SVGElement?new w.Nested:new w.Doc:"linearGradient"==e.nodeName?new w.Gradient("linear"):"radialGradient"==e.nodeName?new w.Gradient("radial"):w[a(e.nodeName)]?new(w[a(e.nodeName)]):new w.Element(e),i.type=e.nodeName,i.node=e,e.instance=i,i instanceof w.Doc&&i.namespace().defs(),i.setData(JSON.parse(e.getAttribute("svgjs:data"))||{}),i},w.prepare=function(){var t=e.getElementsByTagName("body")[0],i=(t?new w.Doc(t):w.adopt(e.documentElement).nested()).size(2,0);w.parser={body:t||e.documentElement,draw:i.style("opacity:0;position:absolute;left:-100%;top:-100%;overflow:hidden").node,poly:i.polyline().node,path:i.path().node,native:w.create("svg")}},w.parser={native:w.create("svg")},e.addEventListener("DOMContentLoaded",function(){w.parser.draw||w.prepare()},!1),w.regex={numberAndUnit:/^([+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?)([a-z%]*)$/i,hex:/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i,rgb:/rgb\((\d+),(\d+),(\d+)\)/,reference:/#([a-z0-9\-_]+)/i,transforms:/\)\s*,?\s*/,whitespace:/\s/g,isHex:/^#[a-f0-9]{3,6}$/i,isRgb:/^rgb\(/,isCss:/[^:]+:[^;]+;?/,isBlank:/^(\s+)?$/,isNumber:/^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i,isPercent:/^-?[\d\.]+%$/,isImage:/\.(jpg|jpeg|png|gif|svg)(\?[^=]+.*)?/i,delimiter:/[\s,]+/,hyphen:/([^e])\-/gi,pathLetters:/[MLHVCSQTAZ]/gi,isPathLetter:/[MLHVCSQTAZ]/i,numbersWithDots:/((\d?\.\d+(?:e[+-]?\d+)?)((?:\.\d+(?:e[+-]?\d+)?)+))+/gi,dots:/\./g},w.utils={map:function(t,e){var i,n=t.length,r=[];for(i=0;i<n;i++)r.push(e(t[i]));return r},filter:function(t,e){var i,n=t.length,r=[];for(i=0;i<n;i++)e(t[i])&&r.push(t[i]);return r},radians:function(t){return t%360*Math.PI/180},degrees:function(t){return 180*t/Math.PI%360},filterSVGElements:function(e){return this.filter(e,function(e){return e instanceof t.SVGElement})}},w.defaults={attrs:{"fill-opacity":1,"stroke-opacity":1,"stroke-width":0,"stroke-linejoin":"miter","stroke-linecap":"butt",fill:"#000000",stroke:"#000000",opacity:1,x:0,y:0,cx:0,cy:0,width:0,height:0,r:0,rx:0,ry:0,offset:0,"stop-opacity":1,"stop-color":"#000000","font-size":16,"font-family":"Helvetica, Arial, sans-serif","text-anchor":"start"}},w.Color=function(t){var e;this.r=0,this.g=0,this.b=0,t&&("string"==typeof t?w.regex.isRgb.test(t)?(e=w.regex.rgb.exec(t.replace(w.regex.whitespace,"")),this.r=parseInt(e[1]),this.g=parseInt(e[2]),this.b=parseInt(e[3])):w.regex.isHex.test(t)&&(e=w.regex.hex.exec(h(t)),this.r=parseInt(e[1],16),this.g=parseInt(e[2],16),this.b=parseInt(e[3],16)):"object"==typeof t&&(this.r=t.r,this.g=t.g,this.b=t.b))},w.extend(w.Color,{toString:function(){return this.toHex()},toHex:function(){return"#"+u(this.r)+u(this.g)+u(this.b)},toRgb:function(){return"rgb("+[this.r,this.g,this.b].join()+")"},brightness:function(){return this.r/255*.3+this.g/255*.59+this.b/255*.11},morph:function(t){return this.destination=new w.Color(t),this},at:function(t){return this.destination?(t=t<0?0:t>1?1:t,new w.Color({r:~~(this.r+(this.destination.r-this.r)*t),g:~~(this.g+(this.destination.g-this.g)*t),b:~~(this.b+(this.destination.b-this.b)*t)})):this}}),w.Color.test=function(t){return t+="",w.regex.isHex.test(t)||w.regex.isRgb.test(t)},w.Color.isRgb=function(t){return t&&"number"==typeof t.r&&"number"==typeof t.g&&"number"==typeof t.b},w.Color.isColor=function(t){return w.Color.isRgb(t)||w.Color.test(t)},w.Array=function(t,e){t=(t||[]).valueOf(),0==t.length&&e&&(t=e.valueOf()),this.value=this.parse(t)},w.extend(w.Array,{morph:function(t){if(this.destination=this.parse(t),this.value.length!=this.destination.length){for(var e=this.value[this.value.length-1],i=this.destination[this.destination.length-1];this.value.length>this.destination.length;)this.destination.push(i);for(;this.value.length<this.destination.length;)this.value.push(e)}return this},settle:function(){for(var t=0,e=this.value.length,i=[];t<e;t++)i.indexOf(this.value[t])==-1&&i.push(this.value[t]);return this.value=i},at:function(t){if(!this.destination)return this;for(var e=0,i=this.value.length,n=[];e<i;e++)n.push(this.value[e]+(this.destination[e]-this.value[e])*t);return new w.Array(n)},toString:function(){return this.value.join(" ")},valueOf:function(){return this.value},parse:function(t){return t=t.valueOf(),Array.isArray(t)?t:this.split(t)},split:function(t){return t.trim().split(w.regex.delimiter).map(parseFloat)},reverse:function(){return this.value.reverse(),this},clone:function(){var t=new this.constructor;return t.value=n(this.value),t}}),w.PointArray=function(t,e){w.Array.call(this,t,e||[[0,0]])},w.PointArray.prototype=new w.Array,w.PointArray.prototype.constructor=w.PointArray,w.extend(w.PointArray,{toString:function(){for(var t=0,e=this.value.length,i=[];t<e;t++)i.push(this.value[t].join(","));return i.join(" ")},toLine:function(){return{x1:this.value[0][0],y1:this.value[0][1],x2:this.value[1][0],y2:this.value[1][1]}},at:function(t){if(!this.destination)return this;for(var e=0,i=this.value.length,n=[];e<i;e++)n.push([this.value[e][0]+(this.destination[e][0]-this.value[e][0])*t,this.value[e][1]+(this.destination[e][1]-this.value[e][1])*t]);return new w.PointArray(n)},parse:function(t){var e=[];if(t=t.valueOf(),Array.isArray(t)){if(Array.isArray(t[0]))return t}else t=t.trim().split(w.regex.delimiter).map(parseFloat);t.length%2!==0&&t.pop();for(var i=0,n=t.length;i<n;i+=2)e.push([t[i],t[i+1]]);return e},move:function(t,e){var i=this.bbox();if(t-=i.x,e-=i.y,!isNaN(t)&&!isNaN(e))for(var n=this.value.length-1;n>=0;n--)this.value[n]=[this.value[n][0]+t,this.value[n][1]+e];return this},size:function(t,e){var i,n=this.bbox();for(i=this.value.length-1;i>=0;i--)n.width&&(this.value[i][0]=(this.value[i][0]-n.x)*t/n.width+n.x),n.height&&(this.value[i][1]=(this.value[i][1]-n.y)*e/n.height+n.y);return this},bbox:function(){return w.parser.poly.setAttribute("points",this.toString()),w.parser.poly.getBBox()}});for(var b={M:function(t,e,i){return e.x=i.x=t[0],e.y=i.y=t[1],["M",e.x,e.y]},L:function(t,e){return e.x=t[0],e.y=t[1],["L",t[0],t[1]]},H:function(t,e){return e.x=t[0],["H",t[0]]},V:function(t,e){return e.y=t[0],["V",t[0]]},C:function(t,e){return e.x=t[4],e.y=t[5],["C",t[0],t[1],t[2],t[3],t[4],t[5]]},S:function(t,e){return e.x=t[2],e.y=t[3],["S",t[0],t[1],t[2],t[3]]},Q:function(t,e){return e.x=t[2],e.y=t[3],["Q",t[0],t[1],t[2],t[3]]},T:function(t,e){return e.x=t[0],e.y=t[1],["T",t[0],t[1]]},Z:function(t,e,i){return e.x=i.x,e.y=i.y,["Z"]},A:function(t,e){return e.x=t[5],e.y=t[6],["A",t[0],t[1],t[2],t[3],t[4],t[5],t[6]]}},C="mlhvqtcsaz".split(""),N=0,A=C.length;N<A;++N)b[C[N]]=function(t){return function(e,i,n){if("H"==t)e[0]=e[0]+i.x;else if("V"==t)e[0]=e[0]+i.y;else if("A"==t)e[5]=e[5]+i.x,e[6]=e[6]+i.y;else for(var r=0,s=e.length;r<s;++r)e[r]=e[r]+(r%2?i.y:i.x);return b[t](e,i,n)}}(C[N].toUpperCase());w.PathArray=function(t,e){w.Array.call(this,t,e||[["M",0,0]])},w.PathArray.prototype=new w.Array,w.PathArray.prototype.constructor=w.PathArray,w.extend(w.PathArray,{toString:function(){return m(this.value)},move:function(t,e){var i=this.bbox();if(t-=i.x,e-=i.y,!isNaN(t)&&!isNaN(e))for(var n,r=this.value.length-1;r>=0;r--)n=this.value[r][0],"M"==n||"L"==n||"T"==n?(this.value[r][1]+=t,this.value[r][2]+=e):"H"==n?this.value[r][1]+=t:"V"==n?this.value[r][1]+=e:"C"==n||"S"==n||"Q"==n?(this.value[r][1]+=t,this.value[r][2]+=e,this.value[r][3]+=t,this.value[r][4]+=e,"C"==n&&(this.value[r][5]+=t,this.value[r][6]+=e)):"A"==n&&(this.value[r][6]+=t,this.value[r][7]+=e);return this},size:function(t,e){var i,n,r=this.bbox();for(i=this.value.length-1;i>=0;i--)n=this.value[i][0],"M"==n||"L"==n||"T"==n?(this.value[i][1]=(this.value[i][1]-r.x)*t/r.width+r.x,this.value[i][2]=(this.value[i][2]-r.y)*e/r.height+r.y):"H"==n?this.value[i][1]=(this.value[i][1]-r.x)*t/r.width+r.x:"V"==n?this.value[i][1]=(this.value[i][1]-r.y)*e/r.height+r.y:"C"==n||"S"==n||"Q"==n?(this.value[i][1]=(this.value[i][1]-r.x)*t/r.width+r.x,this.value[i][2]=(this.value[i][2]-r.y)*e/r.height+r.y,this.value[i][3]=(this.value[i][3]-r.x)*t/r.width+r.x,this.value[i][4]=(this.value[i][4]-r.y)*e/r.height+r.y,"C"==n&&(this.value[i][5]=(this.value[i][5]-r.x)*t/r.width+r.x,this.value[i][6]=(this.value[i][6]-r.y)*e/r.height+r.y)):"A"==n&&(this.value[i][1]=this.value[i][1]*t/r.width,this.value[i][2]=this.value[i][2]*e/r.height,this.value[i][6]=(this.value[i][6]-r.x)*t/r.width+r.x,this.value[i][7]=(this.value[i][7]-r.y)*e/r.height+r.y);return this},equalCommands:function(t){var e,i,n;for(t=new w.PathArray(t),n=this.value.length===t.value.length,e=0,i=this.value.length;n&&e<i;e++)n=this.value[e][0]===t.value[e][0];return n},morph:function(t){return t=new w.PathArray(t),this.equalCommands(t)?this.destination=t:this.destination=null,this},at:function(t){if(!this.destination)return this;var e,i,n,r,s=this.value,o=this.destination.value,a=[],h=new w.PathArray;for(e=0,i=s.length;e<i;e++){for(a[e]=[s[e][0]],n=1,r=s[e].length;n<r;n++)a[e][n]=s[e][n]+(o[e][n]-s[e][n])*t;"A"===a[e][0]&&(a[e][4]=+(0!=a[e][4]),a[e][5]=+(0!=a[e][5]))}return h.value=a,h},parse:function(t){if(t instanceof w.PathArray)return t.valueOf();var e,n,r={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0};t="string"==typeof t?t.replace(w.regex.numbersWithDots,i).replace(w.regex.pathLetters," $& ").replace(w.regex.hyphen,"$1 -").trim().split(w.regex.delimiter):t.reduce(function(t,e){return[].concat.call(t,e)},[]);var n=[],s=new w.Point,o=new w.Point,a=0,h=t.length;do w.regex.isPathLetter.test(t[a])?(e=t[a],++a):"M"==e?e="L":"m"==e&&(e="l"),n.push(b[e].call(null,t.slice(a,a+=r[e.toUpperCase()]).map(parseFloat),s,o));while(h>a);return n},bbox:function(){return w.parser.path.setAttribute("d",this.toString()),w.parser.path.getBBox()}}),w.Number=w.invent({create:function(t,e){this.value=0,this.unit=e||"","number"==typeof t?this.value=isNaN(t)?0:isFinite(t)?t:t<0?-3.4e38:3.4e38:"string"==typeof t?(e=t.match(w.regex.numberAndUnit),e&&(this.value=parseFloat(e[1]),"%"==e[5]?this.value/=100:"s"==e[5]&&(this.value*=1e3),this.unit=e[5])):t instanceof w.Number&&(this.value=t.valueOf(),this.unit=t.unit)},extend:{toString:function(){return("%"==this.unit?~~(1e8*this.value)/1e6:"s"==this.unit?this.value/1e3:this.value)+this.unit},toJSON:function(){return this.toString()},valueOf:function(){return this.value},plus:function(t){return t=new w.Number(t),new w.Number(this+t,this.unit||t.unit)},minus:function(t){return t=new w.Number(t),new w.Number(this-t,this.unit||t.unit)},times:function(t){return t=new w.Number(t),new w.Number(this*t,this.unit||t.unit)},divide:function(t){return t=new w.Number(t),new w.Number(this/t,this.unit||t.unit)},to:function(t){var e=new w.Number(this);return"string"==typeof t&&(e.unit=t),e},morph:function(t){return this.destination=new w.Number(t),t.relative&&(this.destination.value+=this.value),this},at:function(t){return this.destination?new w.Number(this.destination).minus(this).times(t).plus(this):this}}}),w.Element=w.invent({create:function(t){this._stroke=w.defaults.attrs.stroke,this._event=null,this.dom={},(this.node=t)&&(this.type=t.nodeName,this.node.instance=this,this._stroke=t.getAttribute("stroke")||this._stroke)},extend:{x:function(t){return this.attr("x",t)},y:function(t){return this.attr("y",t)},cx:function(t){return null==t?this.x()+this.width()/2:this.x(t-this.width()/2)},cy:function(t){return null==t?this.y()+this.height()/2:this.y(t-this.height()/2)},move:function(t,e){return this.x(t).y(e)},center:function(t,e){return this.cx(t).cy(e)},width:function(t){return this.attr("width",t)},height:function(t){return this.attr("height",t)},size:function(t,e){var i=l(this,t,e);return this.width(new w.Number(i.width)).height(new w.Number(i.height))},clone:function(t,e){this.writeDataToDom();var i=x(this.node.cloneNode(!0));return t?t.add(i):this.after(i),i},remove:function(){return this.parent()&&this.parent().removeElement(this),this},replace:function(t){return this.after(t).remove(),t},addTo:function(t){return t.put(this)},putIn:function(t){return t.add(this)},id:function(t){return this.attr("id",t)},inside:function(t,e){var i=this.bbox();return t>i.x&&e>i.y&&t<i.x+i.width&&e<i.y+i.height},show:function(){return this.style("display","")},hide:function(){return this.style("display","none")},visible:function(){return"none"!=this.style("display")},toString:function(){return this.attr("id")},classes:function(){var t=this.attr("class");return null==t?[]:t.trim().split(w.regex.delimiter)},hasClass:function(t){return this.classes().indexOf(t)!=-1},addClass:function(t){if(!this.hasClass(t)){var e=this.classes();e.push(t),this.attr("class",e.join(" "))}return this},removeClass:function(t){return this.hasClass(t)&&this.attr("class",this.classes().filter(function(e){return e!=t}).join(" ")),this},toggleClass:function(t){return this.hasClass(t)?this.removeClass(t):this.addClass(t)},reference:function(t){return w.get(this.attr(t))},parent:function(e){var i=this;if(!i.node.parentNode)return null;if(i=w.adopt(i.node.parentNode),!e)return i;for(;i&&i.node instanceof t.SVGElement;){if("string"==typeof e?i.matches(e):i instanceof e)return i;if("#document"==i.node.parentNode.nodeName)return null;i=w.adopt(i.node.parentNode)}},doc:function(){return this instanceof w.Doc?this:this.parent(w.Doc)},parents:function(t){var e=[],i=this;do{if(i=i.parent(t),!i||!i.node)break;e.push(i)}while(i.parent);return e},matches:function(t){return s(this.node,t)},native:function(){return this.node},svg:function(t){var i=e.createElement("svg");if(!(t&&this instanceof w.Parent))return i.appendChild(t=e.createElement("svg")),this.writeDataToDom(),t.appendChild(this.node.cloneNode(!0)),i.innerHTML.replace(/^<svg>/,"").replace(/<\/svg>$/,"");i.innerHTML="<svg>"+t.replace(/\n/,"").replace(/<([\w:-]+)([^<]+?)\/>/g,"<$1$2></$1>")+"</svg>";for(var n=0,r=i.firstChild.childNodes.length;n<r;n++)this.node.appendChild(i.firstChild.firstChild);return this},writeDataToDom:function(){if(this.each||this.lines){var t=this.each?this:this.lines();t.each(function(){this.writeDataToDom()})}return this.node.removeAttribute("svgjs:data"),Object.keys(this.dom).length&&this.node.setAttribute("svgjs:data",JSON.stringify(this.dom)),this},setData:function(t){return this.dom=t,this},is:function(t){return r(this,t)}}}),w.easing={"-":function(t){return t},"<>":function(t){return-Math.cos(t*Math.PI)/2+.5},">":function(t){return Math.sin(t*Math.PI/2)},"<":function(t){return-Math.cos(t*Math.PI/2)+1}},w.morph=function(t){return function(e,i){return new w.MorphObj(e,i).at(t)}},w.Situation=w.invent({create:function(t){this.init=!1,this.reversed=!1,this.reversing=!1,this.duration=new w.Number(t.duration).valueOf(),this.delay=new w.Number(t.delay).valueOf(),this.start=+new Date+this.delay,this.finish=this.start+this.duration,this.ease=t.ease,this.loop=0,this.loops=!1,this.animations={},this.attrs={},this.styles={},this.transforms=[],this.once={}}}),w.FX=w.invent({create:function(t){this._target=t,this.situations=[],this.active=!1,this.situation=null,this.paused=!1,this.lastPos=0,this.pos=0,this.absPos=0,this._speed=1},extend:{animate:function(t,e,i){"object"==typeof t&&(e=t.ease,i=t.delay,t=t.duration);var n=new w.Situation({duration:t||1e3,delay:i||0,ease:w.easing[e||"-"]||e});return this.queue(n),this},delay:function(t){var e=new w.Situation({duration:t,delay:0,ease:w.easing["-"]});return this.queue(e)},target:function(t){return t&&t instanceof w.Element?(this._target=t,this):this._target},timeToAbsPos:function(t){return(t-this.situation.start)/(this.situation.duration/this._speed)},absPosToTime:function(t){return this.situation.duration/this._speed*t+this.situation.start},startAnimFrame:function(){this.stopAnimFrame(),this.animationFrame=t.requestAnimationFrame(function(){this.step()}.bind(this))},stopAnimFrame:function(){t.cancelAnimationFrame(this.animationFrame)},start:function(){return!this.active&&this.situation&&(this.active=!0,this.startCurrent()),this},startCurrent:function(){return this.situation.start=+new Date+this.situation.delay/this._speed,this.situation.finish=this.situation.start+this.situation.duration/this._speed,this.initAnimations().step()},queue:function(t){return("function"==typeof t||t instanceof w.Situation)&&this.situations.push(t),this.situation||(this.situation=this.situations.shift()),this},dequeue:function(){return this.stop(),this.situation=this.situations.shift(),this.situation&&(this.situation instanceof w.Situation?this.start():this.situation.call(this)),this},initAnimations:function(){var t,e,i,n=this.situation;if(n.init)return this;for(t in n.animations)for(i=this.target()[t](),Array.isArray(i)||(i=[i]),Array.isArray(n.animations[t])||(n.animations[t]=[n.animations[t]]),e=i.length;e--;)n.animations[t][e]instanceof w.Number&&(i[e]=new w.Number(i[e])),n.animations[t][e]=i[e].morph(n.animations[t][e]);for(t in n.attrs)n.attrs[t]=new w.MorphObj(this.target().attr(t),n.attrs[t]);for(t in n.styles)n.styles[t]=new w.MorphObj(this.target().style(t),n.styles[t]);return n.initialTransformation=this.target().matrixify(),n.init=!0,this},clearQueue:function(){return this.situations=[],this},clearCurrent:function(){return this.situation=null,this},stop:function(t,e){var i=this.active;return this.active=!1,e&&this.clearQueue(),t&&this.situation&&(!i&&this.startCurrent(),this.atEnd()),this.stopAnimFrame(),this.clearCurrent()},reset:function(){if(this.situation){var t=this.situation;this.stop(),this.situation=t,this.atStart()}return this},finish:function(){for(this.stop(!0,!1);this.dequeue().situation&&this.stop(!0,!1););return this.clearQueue().clearCurrent(),this},atStart:function(){return this.at(0,!0)},atEnd:function(){return this.situation.loops===!0&&(this.situation.loops=this.situation.loop+1),"number"==typeof this.situation.loops?this.at(this.situation.loops,!0):this.at(1,!0)},at:function(t,e){var i=this.situation.duration/this._speed;return this.absPos=t,e||(this.situation.reversed&&(this.absPos=1-this.absPos),this.absPos+=this.situation.loop),this.situation.start=+new Date-this.absPos*i,this.situation.finish=this.situation.start+i,this.step(!0)},speed:function(t){return 0===t?this.pause():t?(this._speed=t,this.at(this.absPos,!0)):this._speed},loop:function(t,e){var i=this.last();return i.loops=null==t||t,i.loop=0,e&&(i.reversing=!0),this},pause:function(){return this.paused=!0,this.stopAnimFrame(),this},play:function(){return this.paused?(this.paused=!1,this.at(this.absPos,!0)):this},reverse:function(t){var e=this.last();return"undefined"==typeof t?e.reversed=!e.reversed:e.reversed=t,this},progress:function(t){return t?this.situation.ease(this.pos):this.pos},after:function(t){var e=this.last(),i=function i(n){n.detail.situation==e&&(t.call(this,e),this.off("finished.fx",i))};return this.target().on("finished.fx",i),this._callStart()},during:function(t){var e=this.last(),i=function(i){i.detail.situation==e&&t.call(this,i.detail.pos,w.morph(i.detail.pos),i.detail.eased,e)};return this.target().off("during.fx",i).on("during.fx",i),this.after(function(){this.off("during.fx",i)}),this._callStart()},afterAll:function(t){var e=function e(i){t.call(this),this.off("allfinished.fx",e)};return this.target().off("allfinished.fx",e).on("allfinished.fx",e),this._callStart()},duringAll:function(t){var e=function(e){t.call(this,e.detail.pos,w.morph(e.detail.pos),e.detail.eased,e.detail.situation)};return this.target().off("during.fx",e).on("during.fx",e),this.afterAll(function(){this.off("during.fx",e)}),this._callStart()},last:function(){return this.situations.length?this.situations[this.situations.length-1]:this.situation},add:function(t,e,i){return this.last()[i||"animations"][t]=e,this._callStart()},step:function(t){if(t||(this.absPos=this.timeToAbsPos(+new Date)),this.situation.loops!==!1){var e,i,n;e=Math.max(this.absPos,0),i=Math.floor(e),this.situation.loops===!0||i<this.situation.loops?(this.pos=e-i,n=this.situation.loop,this.situation.loop=i):(this.absPos=this.situation.loops,this.pos=1,n=this.situation.loop-1,this.situation.loop=this.situation.loops),this.situation.reversing&&(this.situation.reversed=this.situation.reversed!=Boolean((this.situation.loop-n)%2))}else this.absPos=Math.min(this.absPos,1),this.pos=this.absPos;this.pos<0&&(this.pos=0),this.situation.reversed&&(this.pos=1-this.pos);var r=this.situation.ease(this.pos);for(var s in this.situation.once)s>this.lastPos&&s<=r&&(this.situation.once[s].call(this.target(),this.pos,r),delete this.situation.once[s]);return this.active&&this.target().fire("during",{pos:this.pos,eased:r,fx:this,situation:this.situation}),this.situation?(this.eachAt(),1==this.pos&&!this.situation.reversed||this.situation.reversed&&0==this.pos?(this.stopAnimFrame(),this.target().fire("finished",{fx:this,situation:this.situation}),this.situations.length||(this.target().fire("allfinished"),this.situations.length||(this.target().off(".fx"),this.active=!1)),this.active?this.dequeue():this.clearCurrent()):!this.paused&&this.active&&this.startAnimFrame(),this.lastPos=r,this):this},eachAt:function(){var t,e,i,n=this,r=this.target(),s=this.situation;for(t in s.animations)i=[].concat(s.animations[t]).map(function(t){return"string"!=typeof t&&t.at?t.at(s.ease(n.pos),n.pos):t}),r[t].apply(r,i);for(t in s.attrs)i=[t].concat(s.attrs[t]).map(function(t){return"string"!=typeof t&&t.at?t.at(s.ease(n.pos),n.pos):t}),r.attr.apply(r,i);for(t in s.styles)i=[t].concat(s.styles[t]).map(function(t){return"string"!=typeof t&&t.at?t.at(s.ease(n.pos),n.pos):t}),r.style.apply(r,i);if(s.transforms.length){for(i=s.initialTransformation,t=0,e=s.transforms.length;t<e;t++){var o=s.transforms[t];o instanceof w.Matrix?i=o.relative?i.multiply((new w.Matrix).morph(o).at(s.ease(this.pos))):i.morph(o).at(s.ease(this.pos)):(o.relative||o.undo(i.extract()),i=i.multiply(o.at(s.ease(this.pos))))}r.matrix(i)}return this},once:function(t,e,i){var n=this.last();return i||(t=n.ease(t)),n.once[t]=e,this},_callStart:function(){return setTimeout(function(){this.start()}.bind(this),0),this}},parent:w.Element,construct:{animate:function(t,e,i){return(this.fx||(this.fx=new w.FX(this))).animate(t,e,i)},delay:function(t){return(this.fx||(this.fx=new w.FX(this))).delay(t)},stop:function(t,e){return this.fx&&this.fx.stop(t,e),this},finish:function(){return this.fx&&this.fx.finish(),this},pause:function(){return this.fx&&this.fx.pause(),this},play:function(){return this.fx&&this.fx.play(),this},speed:function(t){if(this.fx){if(null==t)return this.fx.speed();this.fx.speed(t)}return this}}}),w.MorphObj=w.invent({create:function(t,e){return w.Color.isColor(e)?new w.Color(t).morph(e):w.regex.delimiter.test(t)?w.regex.pathLetters.test(t)?new w.PathArray(t).morph(e):new w.Array(t).morph(e):w.regex.numberAndUnit.test(e)?new w.Number(t).morph(e):(this.value=t,void(this.destination=e))},extend:{at:function(t,e){return e<1?this.value:this.destination},valueOf:function(){return this.value}}}),w.extend(w.FX,{attr:function(t,e,i){if("object"==typeof t)for(var n in t)this.attr(n,t[n]);else this.add(t,e,"attrs");return this},style:function(t,e){if("object"==typeof t)for(var i in t)this.style(i,t[i]);else this.add(t,e,"styles");return this},x:function(t,e){if(this.target()instanceof w.G)return this.transform({x:t},e),this;var i=new w.Number(t);return i.relative=e,this.add("x",i)},y:function(t,e){if(this.target()instanceof w.G)return this.transform({y:t},e),this;var i=new w.Number(t);return i.relative=e,this.add("y",i)},cx:function(t){return this.add("cx",new w.Number(t))},cy:function(t){return this.add("cy",new w.Number(t))},move:function(t,e){return this.x(t).y(e)},center:function(t,e){return this.cx(t).cy(e)},size:function(t,e){if(this.target()instanceof w.Text)this.attr("font-size",t);else{var i;t&&e||(i=this.target().bbox()),t||(t=i.width/i.height*e),e||(e=i.height/i.width*t),this.add("width",new w.Number(t)).add("height",new w.Number(e))}return this},width:function(t){return this.add("width",new w.Number(t))},height:function(t){return this.add("height",new w.Number(t))},plot:function(t,e,i,n){return 4==arguments.length?this.plot([t,e,i,n]):this.add("plot",new(this.target().morphArray)(t))},leading:function(t){return this.target().leading?this.add("leading",new w.Number(t)):this},viewbox:function(t,e,i,n){return this.target()instanceof w.Container&&this.add("viewbox",new w.ViewBox(t,e,i,n)),this},update:function(t){if(this.target()instanceof w.Stop){if("number"==typeof t||t instanceof w.Number)return this.update({offset:arguments[0],color:arguments[1],opacity:arguments[2]});null!=t.opacity&&this.attr("stop-opacity",t.opacity),null!=t.color&&this.attr("stop-color",t.color),null!=t.offset&&this.attr("offset",t.offset)}return this}}),w.Box=w.invent({create:function(t,e,i,n){return"object"!=typeof t||t instanceof w.Element?(4==arguments.length&&(this.x=t,this.y=e,this.width=i,this.height=n),void y(this)):w.Box.call(this,null!=t.left?t.left:t.x,null!=t.top?t.top:t.y,t.width,t.height)},extend:{merge:function(t){var e=new this.constructor;return e.x=Math.min(this.x,t.x),e.y=Math.min(this.y,t.y),e.width=Math.max(this.x+this.width,t.x+t.width)-e.x,e.height=Math.max(this.y+this.height,t.y+t.height)-e.y,y(e)},transform:function(t){var e,i=1/0,n=-(1/0),r=1/0,s=-(1/0),o=[new w.Point(this.x,this.y),new w.Point(this.x2,this.y),new w.Point(this.x,this.y2),new w.Point(this.x2,this.y2)];return o.forEach(function(e){e=e.transform(t),i=Math.min(i,e.x),n=Math.max(n,e.x),r=Math.min(r,e.y),s=Math.max(s,e.y)}),e=new this.constructor,e.x=i,e.width=n-i,e.y=r,e.height=s-r,y(e),e}}}),w.BBox=w.invent({create:function(t){if(w.Box.apply(this,[].slice.call(arguments)),t instanceof w.Element){var i;try{if(e.documentElement.contains){if(!e.documentElement.contains(t.node))throw new Exception("Element not in the dom")}else{for(var n=t.node;n.parentNode;)n=n.parentNode;if(n!=e)throw new Exception("Element not in the dom")}i=t.node.getBBox()}catch(e){if(t instanceof w.Shape){var r=t.clone(w.parser.draw.instance).show();i=r.node.getBBox(),r.remove()}else i={x:t.node.clientLeft,y:t.node.clientTop,width:t.node.clientWidth,height:t.node.clientHeight}}w.Box.call(this,i)}},inherit:w.Box,parent:w.Element,construct:{bbox:function(){return new w.BBox(this)}}}),w.BBox.prototype.constructor=w.BBox,w.extend(w.Element,{tbox:function(){return console.warn("Use of TBox is deprecated and mapped to RBox. Use .rbox() instead."),this.rbox(this.doc())}}),w.RBox=w.invent({create:function(t){w.Box.apply(this,[].slice.call(arguments)),t instanceof w.Element&&w.Box.call(this,t.node.getBoundingClientRect())},inherit:w.Box,parent:w.Element,extend:{addOffset:function(){return this.x+=t.pageXOffset,this.y+=t.pageYOffset,this}},construct:{rbox:function(t){return t?new w.RBox(this).transform(t.screenCTM().inverse()):new w.RBox(this).addOffset()}}}),w.RBox.prototype.constructor=w.RBox,w.Matrix=w.invent({create:function(t){var e,i=f([1,0,0,1,0,0]);for(t=t instanceof w.Element?t.matrixify():"string"==typeof t?f(t.split(w.regex.delimiter).map(parseFloat)):6==arguments.length?f([].slice.call(arguments)):Array.isArray(t)?f(t):"object"==typeof t?t:i,e=P.length-1;e>=0;--e)this[P[e]]=null!=t[P[e]]?t[P[e]]:i[P[e]]},extend:{extract:function(){var t=c(this,0,1),e=c(this,1,0),i=180/Math.PI*Math.atan2(t.y,t.x)-90;return{x:this.e,y:this.f,transformedX:(this.e*Math.cos(i*Math.PI/180)+this.f*Math.sin(i*Math.PI/180))/Math.sqrt(this.a*this.a+this.b*this.b),transformedY:(this.f*Math.cos(i*Math.PI/180)+this.e*Math.sin(-i*Math.PI/180))/Math.sqrt(this.c*this.c+this.d*this.d),skewX:-i,skewY:180/Math.PI*Math.atan2(e.y,e.x),scaleX:Math.sqrt(this.a*this.a+this.b*this.b),scaleY:Math.sqrt(this.c*this.c+this.d*this.d),rotation:i,a:this.a,b:this.b,c:this.c,d:this.d,e:this.e,f:this.f,matrix:new w.Matrix(this)}},clone:function(){return new w.Matrix(this)},morph:function(t){return this.destination=new w.Matrix(t),this},at:function(t){if(!this.destination)return this;var e=new w.Matrix({a:this.a+(this.destination.a-this.a)*t,b:this.b+(this.destination.b-this.b)*t,c:this.c+(this.destination.c-this.c)*t,d:this.d+(this.destination.d-this.d)*t,e:this.e+(this.destination.e-this.e)*t,f:this.f+(this.destination.f-this.f)*t});return e},multiply:function(t){return new w.Matrix(this.native().multiply(d(t).native()))},inverse:function(){return new w.Matrix(this.native().inverse())},translate:function(t,e){return new w.Matrix(this.native().translate(t||0,e||0))},scale:function(t,e,i,n){return 1==arguments.length?e=t:3==arguments.length&&(n=i,i=e,e=t),this.around(i,n,new w.Matrix(t,0,0,e,0,0))},rotate:function(t,e,i){return t=w.utils.radians(t),this.around(e,i,new w.Matrix(Math.cos(t),Math.sin(t),(-Math.sin(t)),Math.cos(t),0,0))},flip:function(t,e){return"x"==t?this.scale(-1,1,e,0):"y"==t?this.scale(1,-1,0,e):this.scale(-1,-1,t,null!=e?e:t)},skew:function(t,e,i,n){return 1==arguments.length?e=t:3==arguments.length&&(n=i,i=e,e=t),t=w.utils.radians(t),e=w.utils.radians(e),this.around(i,n,new w.Matrix(1,Math.tan(e),Math.tan(t),1,0,0))},skewX:function(t,e,i){return this.skew(t,0,e,i);
},skewY:function(t,e,i){return this.skew(0,t,e,i)},around:function(t,e,i){return this.multiply(new w.Matrix(1,0,0,1,t||0,e||0)).multiply(i).multiply(new w.Matrix(1,0,0,1,-t||0,-e||0))},native:function(){for(var t=w.parser.native.createSVGMatrix(),e=P.length-1;e>=0;e--)t[P[e]]=this[P[e]];return t},toString:function(){return"matrix("+g(this.a)+","+g(this.b)+","+g(this.c)+","+g(this.d)+","+g(this.e)+","+g(this.f)+")"}},parent:w.Element,construct:{ctm:function(){return new w.Matrix(this.node.getCTM())},screenCTM:function(){if(this instanceof w.Nested){var t=this.rect(1,1),e=t.node.getScreenCTM();return t.remove(),new w.Matrix(e)}return new w.Matrix(this.node.getScreenCTM())}}}),w.Point=w.invent({create:function(t,e){var i,n={x:0,y:0};i=Array.isArray(t)?{x:t[0],y:t[1]}:"object"==typeof t?{x:t.x,y:t.y}:null!=t?{x:t,y:null!=e?e:t}:n,this.x=i.x,this.y=i.y},extend:{clone:function(){return new w.Point(this)},morph:function(t,e){return this.destination=new w.Point(t,e),this},at:function(t){if(!this.destination)return this;var e=new w.Point({x:this.x+(this.destination.x-this.x)*t,y:this.y+(this.destination.y-this.y)*t});return e},native:function(){var t=w.parser.native.createSVGPoint();return t.x=this.x,t.y=this.y,t},transform:function(t){return new w.Point(this.native().matrixTransform(t.native()))}}}),w.extend(w.Element,{point:function(t,e){return new w.Point(t,e).transform(this.screenCTM().inverse())}}),w.extend(w.Element,{attr:function(t,e,i){if(null==t){for(t={},e=this.node.attributes,i=e.length-1;i>=0;i--)t[e[i].nodeName]=w.regex.isNumber.test(e[i].nodeValue)?parseFloat(e[i].nodeValue):e[i].nodeValue;return t}if("object"==typeof t)for(e in t)this.attr(e,t[e]);else if(null===e)this.node.removeAttribute(t);else{if(null==e)return e=this.node.getAttribute(t),null==e?w.defaults.attrs[t]:w.regex.isNumber.test(e)?parseFloat(e):e;"stroke-width"==t?this.attr("stroke",parseFloat(e)>0?this._stroke:null):"stroke"==t&&(this._stroke=e),"fill"!=t&&"stroke"!=t||(w.regex.isImage.test(e)&&(e=this.doc().defs().image(e,0,0)),e instanceof w.Image&&(e=this.doc().defs().pattern(0,0,function(){this.add(e)}))),"number"==typeof e?e=new w.Number(e):w.Color.isColor(e)?e=new w.Color(e):Array.isArray(e)&&(e=new w.Array(e)),"leading"==t?this.leading&&this.leading(e):"string"==typeof i?this.node.setAttributeNS(i,t,e.toString()):this.node.setAttribute(t,e.toString()),!this.rebuild||"font-size"!=t&&"x"!=t||this.rebuild(t,e)}return this}}),w.extend(w.Element,{transform:function(t,e){var i,n,r=this;if("object"!=typeof t)return i=new w.Matrix(r).extract(),"string"==typeof t?i[t]:i;if(i=new w.Matrix(r),e=!!e||!!t.relative,null!=t.a)i=e?i.multiply(new w.Matrix(t)):new w.Matrix(t);else if(null!=t.rotation)p(t,r),i=e?i.rotate(t.rotation,t.cx,t.cy):i.rotate(t.rotation-i.extract().rotation,t.cx,t.cy);else if(null!=t.scale||null!=t.scaleX||null!=t.scaleY){if(p(t,r),t.scaleX=null!=t.scale?t.scale:null!=t.scaleX?t.scaleX:1,t.scaleY=null!=t.scale?t.scale:null!=t.scaleY?t.scaleY:1,!e){var s=i.extract();t.scaleX=1*t.scaleX/s.scaleX,t.scaleY=1*t.scaleY/s.scaleY}i=i.scale(t.scaleX,t.scaleY,t.cx,t.cy)}else if(null!=t.skew||null!=t.skewX||null!=t.skewY){if(p(t,r),t.skewX=null!=t.skew?t.skew:null!=t.skewX?t.skewX:0,t.skewY=null!=t.skew?t.skew:null!=t.skewY?t.skewY:0,!e){var s=i.extract();i=i.multiply((new w.Matrix).skew(s.skewX,s.skewY,t.cx,t.cy).inverse())}i=i.skew(t.skewX,t.skewY,t.cx,t.cy)}else t.flip?("x"==t.flip||"y"==t.flip?t.offset=null==t.offset?r.bbox()["c"+t.flip]:t.offset:null==t.offset?(n=r.bbox(),t.flip=n.cx,t.offset=n.cy):t.flip=t.offset,i=(new w.Matrix).flip(t.flip,t.offset)):null==t.x&&null==t.y||(e?i=i.translate(t.x,t.y):(null!=t.x&&(i.e=t.x),null!=t.y&&(i.f=t.y)));return this.attr("transform",i)}}),w.extend(w.FX,{transform:function(t,e){var i,n,r=this.target();return"object"!=typeof t?(i=new w.Matrix(r).extract(),"string"==typeof t?i[t]:i):(e=!!e||!!t.relative,null!=t.a?i=new w.Matrix(t):null!=t.rotation?(p(t,r),i=new w.Rotate(t.rotation,t.cx,t.cy)):null!=t.scale||null!=t.scaleX||null!=t.scaleY?(p(t,r),t.scaleX=null!=t.scale?t.scale:null!=t.scaleX?t.scaleX:1,t.scaleY=null!=t.scale?t.scale:null!=t.scaleY?t.scaleY:1,i=new w.Scale(t.scaleX,t.scaleY,t.cx,t.cy)):null!=t.skewX||null!=t.skewY?(p(t,r),t.skewX=null!=t.skewX?t.skewX:0,t.skewY=null!=t.skewY?t.skewY:0,i=new w.Skew(t.skewX,t.skewY,t.cx,t.cy)):t.flip?("x"==t.flip||"y"==t.flip?t.offset=null==t.offset?r.bbox()["c"+t.flip]:t.offset:null==t.offset?(n=r.bbox(),t.flip=n.cx,t.offset=n.cy):t.flip=t.offset,i=(new w.Matrix).flip(t.flip,t.offset)):null==t.x&&null==t.y||(i=new w.Translate(t.x,t.y)),i?(i.relative=e,this.last().transforms.push(i),this._callStart()):this)}}),w.extend(w.Element,{untransform:function(){return this.attr("transform",null)},matrixify:function(){var t=(this.attr("transform")||"").split(w.regex.transforms).slice(0,-1).map(function(t){var e=t.trim().split("(");return[e[0],e[1].split(w.regex.delimiter).map(function(t){return parseFloat(t)})]}).reduce(function(t,e){return"matrix"==e[0]?t.multiply(f(e[1])):t[e[0]].apply(t,e[1])},new w.Matrix);return t},toParent:function(t){if(this==t)return this;var e=this.screenCTM(),i=t.screenCTM().inverse();return this.addTo(t).untransform().transform(i.multiply(e)),this},toDoc:function(){return this.toParent(this.doc())}}),w.Transformation=w.invent({create:function(t,e){if(arguments.length>1&&"boolean"!=typeof e)return this.constructor.call(this,[].slice.call(arguments));if(Array.isArray(t))for(var i=0,n=this.arguments.length;i<n;++i)this[this.arguments[i]]=t[i];else if("object"==typeof t)for(var i=0,n=this.arguments.length;i<n;++i)this[this.arguments[i]]=t[this.arguments[i]];this.inversed=!1,e===!0&&(this.inversed=!0)},extend:{arguments:[],method:"",at:function(t){for(var e=[],i=0,n=this.arguments.length;i<n;++i)e.push(this[this.arguments[i]]);var r=this._undo||new w.Matrix;return r=(new w.Matrix).morph(w.Matrix.prototype[this.method].apply(r,e)).at(t),this.inversed?r.inverse():r},undo:function(t){for(var e=0,i=this.arguments.length;e<i;++e)t[this.arguments[e]]="undefined"==typeof this[this.arguments[e]]?0:t[this.arguments[e]];return t.cx=this.cx,t.cy=this.cy,this._undo=new(w[a(this.method)])(t,(!0)).at(1),this}}}),w.Translate=w.invent({parent:w.Matrix,inherit:w.Transformation,create:function(t,e){this.constructor.apply(this,[].slice.call(arguments))},extend:{arguments:["transformedX","transformedY"],method:"translate"}}),w.Rotate=w.invent({parent:w.Matrix,inherit:w.Transformation,create:function(t,e){this.constructor.apply(this,[].slice.call(arguments))},extend:{arguments:["rotation","cx","cy"],method:"rotate",at:function(t){var e=(new w.Matrix).rotate((new w.Number).morph(this.rotation-(this._undo?this._undo.rotation:0)).at(t),this.cx,this.cy);return this.inversed?e.inverse():e},undo:function(t){return this._undo=t,this}}}),w.Scale=w.invent({parent:w.Matrix,inherit:w.Transformation,create:function(t,e){this.constructor.apply(this,[].slice.call(arguments))},extend:{arguments:["scaleX","scaleY","cx","cy"],method:"scale"}}),w.Skew=w.invent({parent:w.Matrix,inherit:w.Transformation,create:function(t,e){this.constructor.apply(this,[].slice.call(arguments))},extend:{arguments:["skewX","skewY","cx","cy"],method:"skew"}}),w.extend(w.Element,{style:function(t,e){if(0==arguments.length)return this.node.style.cssText||"";if(arguments.length<2)if("object"==typeof t)for(e in t)this.style(e,t[e]);else{if(!w.regex.isCss.test(t))return this.node.style[o(t)];for(t=t.split(/\s*;\s*/).filter(function(t){return!!t}).map(function(t){return t.split(/\s*:\s*/)});e=t.pop();)this.style(e[0],e[1])}else this.node.style[o(t)]=null===e||w.regex.isBlank.test(e)?"":e;return this}}),w.Parent=w.invent({create:function(t){this.constructor.call(this,t)},inherit:w.Element,extend:{children:function(){return w.utils.map(w.utils.filterSVGElements(this.node.childNodes),function(t){return w.adopt(t)})},add:function(t,e){return null==e?this.node.appendChild(t.node):t.node!=this.node.childNodes[e]&&this.node.insertBefore(t.node,this.node.childNodes[e]),this},put:function(t,e){return this.add(t,e),t},has:function(t){return this.index(t)>=0},index:function(t){return[].slice.call(this.node.childNodes).indexOf(t.node)},get:function(t){return w.adopt(this.node.childNodes[t])},first:function(){return this.get(0)},last:function(){return this.get(this.node.childNodes.length-1)},each:function(t,e){var i,n,r=this.children();for(i=0,n=r.length;i<n;i++)r[i]instanceof w.Element&&t.apply(r[i],[i,r]),e&&r[i]instanceof w.Container&&r[i].each(t,e);return this},removeElement:function(t){return this.node.removeChild(t.node),this},clear:function(){for(;this.node.hasChildNodes();)this.node.removeChild(this.node.lastChild);return delete this._defs,this},defs:function(){return this.doc().defs()}}}),w.extend(w.Parent,{ungroup:function(t,e){return 0===e||this instanceof w.Defs||this.node==w.parser.draw?this:(t=t||(this instanceof w.Doc?this:this.parent(w.Parent)),e=e||1/0,this.each(function(){return this instanceof w.Defs?this:this instanceof w.Parent?this.ungroup(t,e-1):this.toParent(t)}),this.node.firstChild||this.remove(),this)},flatten:function(t,e){return this.ungroup(t,e)}}),w.Container=w.invent({create:function(t){this.constructor.call(this,t)},inherit:w.Parent}),w.ViewBox=w.invent({create:function(t){var e,i,n,r,s,o,a,h,u=[0,0,0,0],l=1,c=1,f=/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi;if(t instanceof w.Element){for(a=t,h=t,o=(t.attr("viewBox")||"").match(f),s=t.bbox,n=new w.Number(t.width()),r=new w.Number(t.height());"%"==n.unit;)l*=n.value,n=new w.Number(a instanceof w.Doc?a.parent().offsetWidth:a.parent().width()),a=a.parent();for(;"%"==r.unit;)c*=r.value,r=new w.Number(h instanceof w.Doc?h.parent().offsetHeight:h.parent().height()),h=h.parent();this.x=0,this.y=0,this.width=n*l,this.height=r*c,this.zoom=1,o&&(e=parseFloat(o[0]),i=parseFloat(o[1]),n=parseFloat(o[2]),r=parseFloat(o[3]),this.zoom=this.width/this.height>n/r?this.height/r:this.width/n,this.x=e,this.y=i,this.width=n,this.height=r)}else t="string"==typeof t?t.match(f).map(function(t){return parseFloat(t)}):Array.isArray(t)?t:"object"==typeof t?[t.x,t.y,t.width,t.height]:4==arguments.length?[].slice.call(arguments):u,this.x=t[0],this.y=t[1],this.width=t[2],this.height=t[3]},extend:{toString:function(){return this.x+" "+this.y+" "+this.width+" "+this.height},morph:function(t,e,i,n){return this.destination=new w.ViewBox(t,e,i,n),this},at:function(t){return this.destination?new w.ViewBox([this.x+(this.destination.x-this.x)*t,this.y+(this.destination.y-this.y)*t,this.width+(this.destination.width-this.width)*t,this.height+(this.destination.height-this.height)*t]):this}},parent:w.Container,construct:{viewbox:function(t,e,i,n){return 0==arguments.length?new w.ViewBox(this):this.attr("viewBox",new w.ViewBox(t,e,i,n))}}}),["click","dblclick","mousedown","mouseup","mouseover","mouseout","mousemove","touchstart","touchmove","touchleave","touchend","touchcancel"].forEach(function(t){w.Element.prototype[t]=function(e){return w.on(this.node,t,e),this}}),w.listeners=[],w.handlerMap=[],w.listenerId=0,w.on=function(t,e,i,n,r){var s=i.bind(n||t.instance||t),o=(w.handlerMap.indexOf(t)+1||w.handlerMap.push(t))-1,a=e.split(".")[0],h=e.split(".")[1]||"*";w.listeners[o]=w.listeners[o]||{},w.listeners[o][a]=w.listeners[o][a]||{},w.listeners[o][a][h]=w.listeners[o][a][h]||{},i._svgjsListenerId||(i._svgjsListenerId=++w.listenerId),w.listeners[o][a][h][i._svgjsListenerId]=s,t.addEventListener(a,s,r||!1)},w.off=function(t,e,i){var n=w.handlerMap.indexOf(t),r=e&&e.split(".")[0],s=e&&e.split(".")[1],o="";if(n!=-1)if(i){if("function"==typeof i&&(i=i._svgjsListenerId),!i)return;w.listeners[n][r]&&w.listeners[n][r][s||"*"]&&(t.removeEventListener(r,w.listeners[n][r][s||"*"][i],!1),delete w.listeners[n][r][s||"*"][i])}else if(s&&r){if(w.listeners[n][r]&&w.listeners[n][r][s]){for(i in w.listeners[n][r][s])w.off(t,[r,s].join("."),i);delete w.listeners[n][r][s]}}else if(s)for(e in w.listeners[n])for(o in w.listeners[n][e])s===o&&w.off(t,[e,s].join("."));else if(r){if(w.listeners[n][r]){for(o in w.listeners[n][r])w.off(t,[r,o].join("."));delete w.listeners[n][r]}}else{for(e in w.listeners[n])w.off(t,e);delete w.listeners[n],delete w.handlerMap[n]}},w.extend(w.Element,{on:function(t,e,i,n){return w.on(this.node,t,e,i,n),this},off:function(t,e){return w.off(this.node,t,e),this},fire:function(e,i){return e instanceof t.Event?this.node.dispatchEvent(e):this.node.dispatchEvent(e=new t.CustomEvent(e,{detail:i,cancelable:!0})),this._event=e,this},event:function(){return this._event}}),w.Defs=w.invent({create:"defs",inherit:w.Container}),w.G=w.invent({create:"g",inherit:w.Container,extend:{x:function(t){return null==t?this.transform("x"):this.transform({x:t-this.x()},!0)},y:function(t){return null==t?this.transform("y"):this.transform({y:t-this.y()},!0)},cx:function(t){return null==t?this.gbox().cx:this.x(t-this.gbox().width/2)},cy:function(t){return null==t?this.gbox().cy:this.y(t-this.gbox().height/2)},gbox:function(){var t=this.bbox(),e=this.transform();return t.x+=e.x,t.x2+=e.x,t.cx+=e.x,t.y+=e.y,t.y2+=e.y,t.cy+=e.y,t}},construct:{group:function(){return this.put(new w.G)}}}),w.extend(w.Element,{siblings:function(){return this.parent().children()},position:function(){return this.parent().index(this)},next:function(){return this.siblings()[this.position()+1]},previous:function(){return this.siblings()[this.position()-1]},forward:function(){var t=this.position()+1,e=this.parent();return e.removeElement(this).add(this,t),e instanceof w.Doc&&e.node.appendChild(e.defs().node),this},backward:function(){var t=this.position();return t>0&&this.parent().removeElement(this).add(this,t-1),this},front:function(){var t=this.parent();return t.node.appendChild(this.node),t instanceof w.Doc&&t.node.appendChild(t.defs().node),this},back:function(){return this.position()>0&&this.parent().removeElement(this).add(this,0),this},before:function(t){t.remove();var e=this.position();return this.parent().add(t,e),this},after:function(t){t.remove();var e=this.position();return this.parent().add(t,e+1),this}}),w.Mask=w.invent({create:function(){this.constructor.call(this,w.create("mask")),this.targets=[]},inherit:w.Container,extend:{remove:function(){for(var t=this.targets.length-1;t>=0;t--)this.targets[t]&&this.targets[t].unmask();return this.targets=[],this.parent().removeElement(this),this}},construct:{mask:function(){return this.defs().put(new w.Mask)}}}),w.extend(w.Element,{maskWith:function(t){return this.masker=t instanceof w.Mask?t:this.parent().mask().add(t),this.masker.targets.push(this),this.attr("mask",'url("#'+this.masker.attr("id")+'")')},unmask:function(){return delete this.masker,this.attr("mask",null)}}),w.ClipPath=w.invent({create:function(){this.constructor.call(this,w.create("clipPath")),this.targets=[]},inherit:w.Container,extend:{remove:function(){for(var t=this.targets.length-1;t>=0;t--)this.targets[t]&&this.targets[t].unclip();return this.targets=[],this.parent().removeElement(this),this}},construct:{clip:function(){return this.defs().put(new w.ClipPath)}}}),w.extend(w.Element,{clipWith:function(t){return this.clipper=t instanceof w.ClipPath?t:this.parent().clip().add(t),this.clipper.targets.push(this),this.attr("clip-path",'url("#'+this.clipper.attr("id")+'")')},unclip:function(){return delete this.clipper,this.attr("clip-path",null)}}),w.Gradient=w.invent({create:function(t){this.constructor.call(this,w.create(t+"Gradient")),this.type=t},inherit:w.Container,extend:{at:function(t,e,i){return this.put(new w.Stop).update(t,e,i)},update:function(t){return this.clear(),"function"==typeof t&&t.call(this,this),this},fill:function(){return"url(#"+this.id()+")"},toString:function(){return this.fill()},attr:function(t,e,i){return"transform"==t&&(t="gradientTransform"),w.Container.prototype.attr.call(this,t,e,i)}},construct:{gradient:function(t,e){return this.defs().gradient(t,e)}}}),w.extend(w.Gradient,w.FX,{from:function(t,e){return"radial"==(this._target||this).type?this.attr({fx:new w.Number(t),fy:new w.Number(e)}):this.attr({x1:new w.Number(t),y1:new w.Number(e)})},to:function(t,e){return"radial"==(this._target||this).type?this.attr({cx:new w.Number(t),cy:new w.Number(e)}):this.attr({x2:new w.Number(t),y2:new w.Number(e)})}}),w.extend(w.Defs,{gradient:function(t,e){return this.put(new w.Gradient(t)).update(e)}}),w.Stop=w.invent({create:"stop",inherit:w.Element,extend:{update:function(t){return("number"==typeof t||t instanceof w.Number)&&(t={offset:arguments[0],color:arguments[1],opacity:arguments[2]}),null!=t.opacity&&this.attr("stop-opacity",t.opacity),null!=t.color&&this.attr("stop-color",t.color),null!=t.offset&&this.attr("offset",new w.Number(t.offset)),this}}}),w.Pattern=w.invent({create:"pattern",inherit:w.Container,extend:{fill:function(){return"url(#"+this.id()+")"},update:function(t){return this.clear(),"function"==typeof t&&t.call(this,this),this},toString:function(){return this.fill()},attr:function(t,e,i){return"transform"==t&&(t="patternTransform"),w.Container.prototype.attr.call(this,t,e,i)}},construct:{pattern:function(t,e,i){return this.defs().pattern(t,e,i)}}}),w.extend(w.Defs,{pattern:function(t,e,i){return this.put(new w.Pattern).update(i).attr({x:0,y:0,width:t,height:e,patternUnits:"userSpaceOnUse"})}}),w.Doc=w.invent({create:function(t){t&&(t="string"==typeof t?e.getElementById(t):t,"svg"==t.nodeName?this.constructor.call(this,t):(this.constructor.call(this,w.create("svg")),t.appendChild(this.node),this.size("100%","100%")),this.namespace().defs())},inherit:w.Container,extend:{namespace:function(){return this.attr({xmlns:w.ns,version:"1.1"}).attr("xmlns:xlink",w.xlink,w.xmlns).attr("xmlns:svgjs",w.svgjs,w.xmlns)},defs:function(){if(!this._defs){var t;(t=this.node.getElementsByTagName("defs")[0])?this._defs=w.adopt(t):this._defs=new w.Defs,this.node.appendChild(this._defs.node)}return this._defs},parent:function(){return"#document"==this.node.parentNode.nodeName?null:this.node.parentNode},spof:function(){var t=this.node.getScreenCTM();return t&&this.style("left",-t.e%1+"px").style("top",-t.f%1+"px"),this},remove:function(){return this.parent()&&this.parent().removeChild(this.node),this},clear:function(){for(;this.node.hasChildNodes();)this.node.removeChild(this.node.lastChild);return delete this._defs,w.parser.draw.parentNode||this.node.appendChild(w.parser.draw),this}}}),w.Shape=w.invent({create:function(t){this.constructor.call(this,t)},inherit:w.Element}),w.Bare=w.invent({create:function(t,e){if(this.constructor.call(this,w.create(t)),e)for(var i in e.prototype)"function"==typeof e.prototype[i]&&(this[i]=e.prototype[i])},inherit:w.Element,extend:{words:function(t){for(;this.node.hasChildNodes();)this.node.removeChild(this.node.lastChild);return this.node.appendChild(e.createTextNode(t)),this}}}),w.extend(w.Parent,{element:function(t,e){return this.put(new w.Bare(t,e))}}),w.Symbol=w.invent({create:"symbol",inherit:w.Container,construct:{symbol:function(){return this.put(new w.Symbol)}}}),w.Use=w.invent({create:"use",inherit:w.Shape,extend:{element:function(t,e){return this.attr("href",(e||"")+"#"+t,w.xlink)}},construct:{use:function(t,e){return this.put(new w.Use).element(t,e)}}}),w.Rect=w.invent({create:"rect",inherit:w.Shape,construct:{rect:function(t,e){return this.put(new w.Rect).size(t,e)}}}),w.Circle=w.invent({create:"circle",inherit:w.Shape,construct:{circle:function(t){return this.put(new w.Circle).rx(new w.Number(t).divide(2)).move(0,0)}}}),w.extend(w.Circle,w.FX,{rx:function(t){return this.attr("r",t)},ry:function(t){return this.rx(t)}}),w.Ellipse=w.invent({create:"ellipse",inherit:w.Shape,construct:{ellipse:function(t,e){return this.put(new w.Ellipse).size(t,e).move(0,0)}}}),w.extend(w.Ellipse,w.Rect,w.FX,{rx:function(t){return this.attr("rx",t)},ry:function(t){return this.attr("ry",t)}}),w.extend(w.Circle,w.Ellipse,{x:function(t){return null==t?this.cx()-this.rx():this.cx(t+this.rx())},y:function(t){return null==t?this.cy()-this.ry():this.cy(t+this.ry())},cx:function(t){return null==t?this.attr("cx"):this.attr("cx",t)},cy:function(t){return null==t?this.attr("cy"):this.attr("cy",t)},width:function(t){return null==t?2*this.rx():this.rx(new w.Number(t).divide(2))},height:function(t){return null==t?2*this.ry():this.ry(new w.Number(t).divide(2))},size:function(t,e){var i=l(this,t,e);return this.rx(new w.Number(i.width).divide(2)).ry(new w.Number(i.height).divide(2))}}),w.Line=w.invent({create:"line",inherit:w.Shape,extend:{array:function(){return new w.PointArray([[this.attr("x1"),this.attr("y1")],[this.attr("x2"),this.attr("y2")]])},plot:function(t,e,i,n){return null==t?this.array():(t="undefined"!=typeof e?{x1:t,y1:e,x2:i,y2:n}:new w.PointArray(t).toLine(),this.attr(t))},move:function(t,e){return this.attr(this.array().move(t,e).toLine())},size:function(t,e){var i=l(this,t,e);return this.attr(this.array().size(i.width,i.height).toLine())}},construct:{line:function(t,e,i,n){return w.Line.prototype.plot.apply(this.put(new w.Line),null!=t?[t,e,i,n]:[0,0,0,0])}}}),w.Polyline=w.invent({create:"polyline",inherit:w.Shape,construct:{polyline:function(t){return this.put(new w.Polyline).plot(t||new w.PointArray)}}}),w.Polygon=w.invent({create:"polygon",inherit:w.Shape,construct:{polygon:function(t){return this.put(new w.Polygon).plot(t||new w.PointArray)}}}),w.extend(w.Polyline,w.Polygon,{array:function(){return this._array||(this._array=new w.PointArray(this.attr("points")))},plot:function(t){return null==t?this.array():this.clear().attr("points","string"==typeof t?t:this._array=new w.PointArray(t))},clear:function(){return delete this._array,this},move:function(t,e){return this.attr("points",this.array().move(t,e))},size:function(t,e){var i=l(this,t,e);return this.attr("points",this.array().size(i.width,i.height))}}),w.extend(w.Line,w.Polyline,w.Polygon,{morphArray:w.PointArray,x:function(t){return null==t?this.bbox().x:this.move(t,this.bbox().y)},y:function(t){return null==t?this.bbox().y:this.move(this.bbox().x,t)},width:function(t){var e=this.bbox();return null==t?e.width:this.size(t,e.height)},height:function(t){var e=this.bbox();return null==t?e.height:this.size(e.width,t)}}),w.Path=w.invent({create:"path",inherit:w.Shape,extend:{morphArray:w.PathArray,array:function(){return this._array||(this._array=new w.PathArray(this.attr("d")))},plot:function(t){return null==t?this.array():this.clear().attr("d","string"==typeof t?t:this._array=new w.PathArray(t))},clear:function(){return delete this._array,this},move:function(t,e){return this.attr("d",this.array().move(t,e))},x:function(t){return null==t?this.bbox().x:this.move(t,this.bbox().y)},y:function(t){return null==t?this.bbox().y:this.move(this.bbox().x,t)},size:function(t,e){var i=l(this,t,e);return this.attr("d",this.array().size(i.width,i.height))},width:function(t){return null==t?this.bbox().width:this.size(t,this.bbox().height)},height:function(t){return null==t?this.bbox().height:this.size(this.bbox().width,t)}},construct:{path:function(t){return this.put(new w.Path).plot(t||new w.PathArray)}}}),w.Image=w.invent({create:"image",inherit:w.Shape,extend:{load:function(e){if(!e)return this;var i=this,n=new t.Image;return w.on(n,"load",function(){w.off(n);var t=i.parent(w.Pattern);null!==t&&(0==i.width()&&0==i.height()&&i.size(n.width,n.height),t&&0==t.width()&&0==t.height()&&t.size(i.width(),i.height()),"function"==typeof i._loaded&&i._loaded.call(i,{width:n.width,height:n.height,ratio:n.width/n.height,url:e}))}),w.on(n,"error",function(t){w.off(n),"function"==typeof i._error&&i._error.call(i,t)}),this.attr("href",n.src=this.src=e,w.xlink)},loaded:function(t){return this._loaded=t,this},error:function(t){return this._error=t,this}},construct:{image:function(t,e,i){return this.put(new w.Image).load(t).size(e||0,i||e||0)}}}),w.Text=w.invent({create:function(){this.constructor.call(this,w.create("text")),this.dom.leading=new w.Number(1.3),this._rebuild=!0,this._build=!1,this.attr("font-family",w.defaults.attrs["font-family"])},inherit:w.Shape,extend:{x:function(t){return null==t?this.attr("x"):this.attr("x",t)},y:function(t){var e=this.attr("y"),i="number"==typeof e?e-this.bbox().y:0;return null==t?"number"==typeof e?e-i:e:this.attr("y","number"==typeof t?t+i:t)},cx:function(t){return null==t?this.bbox().cx:this.x(t-this.bbox().width/2)},cy:function(t){return null==t?this.bbox().cy:this.y(t-this.bbox().height/2)},text:function(t){if("undefined"==typeof t){for(var t="",e=this.node.childNodes,i=0,n=e.length;i<n;++i)0!=i&&3!=e[i].nodeType&&1==w.adopt(e[i]).dom.newLined&&(t+="\n"),t+=e[i].textContent;return t}if(this.clear().build(!0),"function"==typeof t)t.call(this,this);else{t=t.split("\n");for(var i=0,r=t.length;i<r;i++)this.tspan(t[i]).newLine()}return this.build(!1).rebuild()},size:function(t){return this.attr("font-size",t).rebuild()},leading:function(t){return null==t?this.dom.leading:(this.dom.leading=new w.Number(t),this.rebuild())},lines:function(){var t=(this.textPath&&this.textPath()||this).node,e=w.utils.map(w.utils.filterSVGElements(t.childNodes),function(t){return w.adopt(t)});return new w.Set(e)},rebuild:function(t){if("boolean"==typeof t&&(this._rebuild=t),this._rebuild){var e=this,i=0,n=this.dom.leading*new w.Number(this.attr("font-size"));this.lines().each(function(){this.dom.newLined&&(e.textPath()||this.attr("x",e.attr("x")),"\n"==this.text()?i+=n:(this.attr("dy",n+i),i=0))}),this.fire("rebuild")}return this},build:function(t){return this._build=!!t,this},setData:function(t){return this.dom=t,this.dom.leading=new w.Number(t.leading||1.3),this}},construct:{text:function(t){return this.put(new w.Text).text(t)},plain:function(t){return this.put(new w.Text).plain(t)}}}),w.Tspan=w.invent({create:"tspan",inherit:w.Shape,extend:{text:function(t){return null==t?this.node.textContent+(this.dom.newLined?"\n":""):("function"==typeof t?t.call(this,this):this.plain(t),this)},dx:function(t){return this.attr("dx",t)},dy:function(t){return this.attr("dy",t)},newLine:function(){var t=this.parent(w.Text);return this.dom.newLined=!0,this.dy(t.dom.leading*t.attr("font-size")).attr("x",t.x())}}}),w.extend(w.Text,w.Tspan,{plain:function(t){return this._build===!1&&this.clear(),this.node.appendChild(e.createTextNode(t)),this},tspan:function(t){var e=(this.textPath&&this.textPath()||this).node,i=new w.Tspan;return this._build===!1&&this.clear(),e.appendChild(i.node),i.text(t)},clear:function(){for(var t=(this.textPath&&this.textPath()||this).node;t.hasChildNodes();)t.removeChild(t.lastChild);return this},length:function(){return this.node.getComputedTextLength()}}),w.TextPath=w.invent({create:"textPath",inherit:w.Parent,parent:w.Text,construct:{morphArray:w.PathArray,path:function(t){for(var e=new w.TextPath,i=this.doc().defs().path(t);this.node.hasChildNodes();)e.node.appendChild(this.node.firstChild);return this.node.appendChild(e.node),e.attr("href","#"+i,w.xlink),this},array:function(){var t=this.track();return t?t.array():null},plot:function(t){var e=this.track(),i=null;return e&&(i=e.plot(t)),null==t?i:this},track:function(){var t=this.textPath();if(t)return t.reference("href")},textPath:function(){if(this.node.firstChild&&"textPath"==this.node.firstChild.nodeName)return w.adopt(this.node.firstChild)}}}),w.Nested=w.invent({create:function(){this.constructor.call(this,w.create("svg")),this.style("overflow","visible")},inherit:w.Container,construct:{nested:function(){return this.put(new w.Nested)}}}),w.A=w.invent({create:"a",inherit:w.Container,extend:{to:function(t){return this.attr("href",t,w.xlink)},show:function(t){return this.attr("show",t,w.xlink)},target:function(t){return this.attr("target",t)}},construct:{link:function(t){return this.put(new w.A).to(t)}}}),w.extend(w.Element,{linkTo:function(t){var e=new w.A;return"function"==typeof t?t.call(e,e):e.to(t),this.parent().put(e).put(this)}}),w.Marker=w.invent({create:"marker",inherit:w.Container,extend:{width:function(t){return this.attr("markerWidth",t)},height:function(t){return this.attr("markerHeight",t)},ref:function(t,e){return this.attr("refX",t).attr("refY",e)},update:function(t){return this.clear(),"function"==typeof t&&t.call(this,this),this},toString:function(){return"url(#"+this.id()+")"}},construct:{marker:function(t,e,i){return this.defs().marker(t,e,i)}}}),w.extend(w.Defs,{marker:function(t,e,i){return this.put(new w.Marker).size(t,e).ref(t/2,e/2).viewbox(0,0,t,e).attr("orient","auto").update(i)}}),w.extend(w.Line,w.Polyline,w.Polygon,w.Path,{marker:function(t,e,i,n){var r=["marker"];return"all"!=t&&r.push(t),r=r.join("-"),t=arguments[1]instanceof w.Marker?arguments[1]:this.doc().marker(e,i,n),this.attr(r,t)}});var M={stroke:["color","width","opacity","linecap","linejoin","miterlimit","dasharray","dashoffset"],fill:["color","opacity","rule"],prefix:function(t,e){return"color"==e?t:t+"-"+e}};["fill","stroke"].forEach(function(t){var e,i={};i[t]=function(i){if("undefined"==typeof i)return this;if("string"==typeof i||w.Color.isRgb(i)||i&&"function"==typeof i.fill)this.attr(t,i);else for(e=M[t].length-1;e>=0;e--)null!=i[M[t][e]]&&this.attr(M.prefix(t,M[t][e]),i[M[t][e]]);return this},w.extend(w.Element,w.FX,i)}),w.extend(w.Element,w.FX,{rotate:function(t,e,i){return this.transform({rotation:t,cx:e,cy:i})},skew:function(t,e,i,n){return 1==arguments.length||3==arguments.length?this.transform({skew:t,cx:e,cy:i}):this.transform({skewX:t,skewY:e,cx:i,cy:n})},scale:function(t,e,i,n){return 1==arguments.length||3==arguments.length?this.transform({scale:t,cx:e,cy:i}):this.transform({scaleX:t,scaleY:e,cx:i,cy:n})},translate:function(t,e){return this.transform({x:t,y:e})},flip:function(t,e){return e="number"==typeof t?t:e,this.transform({flip:t||"both",offset:e})},matrix:function(t){return this.attr("transform",new w.Matrix(6==arguments.length?[].slice.call(arguments):t))},opacity:function(t){return this.attr("opacity",t)},dx:function(t){return this.x(new w.Number(t).plus(this instanceof w.FX?0:this.x()),!0)},dy:function(t){return this.y(new w.Number(t).plus(this instanceof w.FX?0:this.y()),!0)},dmove:function(t,e){return this.dx(t).dy(e)}}),w.extend(w.Rect,w.Ellipse,w.Circle,w.Gradient,w.FX,{radius:function(t,e){var i=(this._target||this).type;return"radial"==i||"circle"==i?this.attr("r",new w.Number(t)):this.rx(t).ry(null==e?t:e)}}),w.extend(w.Path,{length:function(){return this.node.getTotalLength()},pointAt:function(t){return this.node.getPointAtLength(t)}}),w.extend(w.Parent,w.Text,w.Tspan,w.FX,{font:function(t,e){if("object"==typeof t)for(e in t)this.font(e,t[e]);return"leading"==t?this.leading(e):"anchor"==t?this.attr("text-anchor",e):"size"==t||"family"==t||"weight"==t||"stretch"==t||"variant"==t||"style"==t?this.attr("font-"+t,e):this.attr(t,e)}}),w.Set=w.invent({create:function(t){Array.isArray(t)?this.members=t:this.clear()},extend:{add:function(){var t,e,i=[].slice.call(arguments);for(t=0,e=i.length;t<e;t++)this.members.push(i[t]);return this},remove:function(t){var e=this.index(t);return e>-1&&this.members.splice(e,1),this},each:function(t){for(var e=0,i=this.members.length;e<i;e++)t.apply(this.members[e],[e,this.members]);return this},clear:function(){return this.members=[],this},length:function(){return this.members.length},has:function(t){return this.index(t)>=0},index:function(t){return this.members.indexOf(t)},get:function(t){return this.members[t]},first:function(){return this.get(0)},last:function(){return this.get(this.members.length-1)},valueOf:function(){return this.members},bbox:function(){if(0==this.members.length)return new w.RBox;var t=this.members[0].rbox(this.members[0].doc());return this.each(function(){t=t.merge(this.rbox(this.doc()))}),t}},construct:{set:function(t){return new w.Set(t)}}}),w.FX.Set=w.invent({create:function(t){this.set=t}}),w.Set.inherit=function(){var t,e=[];for(var t in w.Shape.prototype)"function"==typeof w.Shape.prototype[t]&&"function"!=typeof w.Set.prototype[t]&&e.push(t);e.forEach(function(t){w.Set.prototype[t]=function(){for(var e=0,i=this.members.length;e<i;e++)this.members[e]&&"function"==typeof this.members[e][t]&&this.members[e][t].apply(this.members[e],arguments);
return"animate"==t?this.fx||(this.fx=new w.FX.Set(this)):this}}),e=[];for(var t in w.FX.prototype)"function"==typeof w.FX.prototype[t]&&"function"!=typeof w.FX.Set.prototype[t]&&e.push(t);e.forEach(function(t){w.FX.Set.prototype[t]=function(){for(var e=0,i=this.set.members.length;e<i;e++)this.set.members[e].fx[t].apply(this.set.members[e].fx,arguments);return this}})},w.extend(w.Element,{data:function(t,e,i){if("object"==typeof t)for(e in t)this.data(e,t[e]);else if(arguments.length<2)try{return JSON.parse(this.attr("data-"+t))}catch(e){return this.attr("data-"+t)}else this.attr("data-"+t,null===e?null:i===!0||"string"==typeof e||"number"==typeof e?e:JSON.stringify(e));return this}}),w.extend(w.Element,{remember:function(t,e){if("object"==typeof arguments[0])for(var e in t)this.remember(e,t[e]);else{if(1==arguments.length)return this.memory()[t];this.memory()[t]=e}return this},forget:function(){if(0==arguments.length)this._memory={};else for(var t=arguments.length-1;t>=0;t--)delete this.memory()[arguments[t]];return this},memory:function(){return this._memory||(this._memory={})}}),w.get=function(t){var i=e.getElementById(v(t)||t);return w.adopt(i)},w.select=function(t,i){return new w.Set(w.utils.map((i||e).querySelectorAll(t),function(t){return w.adopt(t)}))},w.extend(w.Parent,{select:function(t){return w.select(t,this.node)}});var P="abcdef".split("");if("function"!=typeof t.CustomEvent){var k=function(t,i){i=i||{bubbles:!1,cancelable:!1,detail:void 0};var n=e.createEvent("CustomEvent");return n.initCustomEvent(t,i.bubbles,i.cancelable,i.detail),n};k.prototype=t.Event.prototype,t.CustomEvent=k}return function(e){for(var i=0,n=["moz","webkit"],r=0;r<n.length&&!t.requestAnimationFrame;++r)e.requestAnimationFrame=e[n[r]+"RequestAnimationFrame"],e.cancelAnimationFrame=e[n[r]+"CancelAnimationFrame"]||e[n[r]+"CancelRequestAnimationFrame"];e.requestAnimationFrame=e.requestAnimationFrame||function(t){var n=(new Date).getTime(),r=Math.max(0,16-(n-i)),s=e.setTimeout(function(){t(n+r)},r);return i=n+r,s},e.cancelAnimationFrame=e.cancelAnimationFrame||e.clearTimeout}(t),w});
var rough=function(){"use strict";function a(){return{LEFT:0,RIGHT:1,INTERSECTS:2,AHEAD:3,BEHIND:4,SEPARATE:5,UNDEFINED:6}}var b=Math.round,c=Math.tan,d=Math.pow,e=Math.floor,f=Math.cos,g=Math.sin,h=Math.PI,j=Math.sqrt,k=Math.max,l=Math.min,i=Math.abs,m=Number.MAX_VALUE;class n{constructor(b,c,d,e){this.RoughSegmentRelationConst=a(),this.px1=b,this.py1=c,this.px2=d,this.py2=e,this.xi=m,this.yi=m,this.a=e-c,this.b=b-d,this.c=d*c-b*e,this._undefined=0==this.a&&0==this.b&&0==this.c}isUndefined(){return this._undefined}compare(d){if(this.isUndefined()||d.isUndefined())return this.RoughSegmentRelationConst.UNDEFINED;var e=m,f=m,g=0,h=0,j=this.a,n=this.b,b=this.c;return(1e-5<i(n)&&(e=-j/n,g=-b/n),1e-5<i(d.b)&&(f=-d.a/d.b,h=-d.c/d.b),e==m)?f==m?-b/j==-d.c/d.a?this.py1>=l(d.py1,d.py2)&&this.py1<=k(d.py1,d.py2)?(this.xi=this.px1,this.yi=this.py1,this.RoughSegmentRelationConst.INTERSECTS):this.py2>=l(d.py1,d.py2)&&this.py2<=k(d.py1,d.py2)?(this.xi=this.px2,this.yi=this.py2,this.RoughSegmentRelationConst.INTERSECTS):this.RoughSegmentRelationConst.SEPARATE:this.RoughSegmentRelationConst.SEPARATE:(this.xi=this.px1,this.yi=f*this.xi+h,-1e-5>(this.py1-this.yi)*(this.yi-this.py2)||-1e-5>(d.py1-this.yi)*(this.yi-d.py2)?this.RoughSegmentRelationConst.SEPARATE:1e-5>i(d.a)?-1e-5>(d.px1-this.xi)*(this.xi-d.px2)?this.RoughSegmentRelationConst.SEPARATE:this.RoughSegmentRelationConst.INTERSECTS:this.RoughSegmentRelationConst.INTERSECTS):f==m?(this.xi=d.px1,this.yi=e*this.xi+g,-1e-5>(d.py1-this.yi)*(this.yi-d.py2)||-1e-5>(this.py1-this.yi)*(this.yi-this.py2)?this.RoughSegmentRelationConst.SEPARATE:1e-5>i(j)?-1e-5>(this.px1-this.xi)*(this.xi-this.px2)?this.RoughSegmentRelationConst.SEPARATE:this.RoughSegmentRelationConst.INTERSECTS:this.RoughSegmentRelationConst.INTERSECTS):e==f?g==h?this.px1>=l(d.px1,d.px2)&&this.px1<=k(d.py1,d.py2)?(this.xi=this.px1,this.yi=this.py1,this.RoughSegmentRelationConst.INTERSECTS):this.px2>=l(d.px1,d.px2)&&this.px2<=k(d.px1,d.px2)?(this.xi=this.px2,this.yi=this.py2,this.RoughSegmentRelationConst.INTERSECTS):this.RoughSegmentRelationConst.SEPARATE:this.RoughSegmentRelationConst.SEPARATE:(this.xi=(h-g)/(e-f),this.yi=e*this.xi+g,-1e-5>(this.px1-this.xi)*(this.xi-this.px2)||-1e-5>(d.px1-this.xi)*(this.xi-d.px2)?this.RoughSegmentRelationConst.SEPARATE:this.RoughSegmentRelationConst.INTERSECTS)}getLength(){return this._getLength(this.px1,this.py1,this.px2,this.py2)}_getLength(a,b,c,d){var e=c-a,f=d-b;return j(e*e+f*f)}}class p{constructor(a,b,c,d,e,f,g,h){this.top=a,this.bottom=b,this.left=c,this.right=d,this.gap=e,this.sinAngle=f,this.tanAngle=h,1e-4>i(f)?this.pos=c+e:.9999<i(f)?this.pos=a+e:(this.deltaX=(b-a)*i(h),this.pos=c-i(this.deltaX),this.hGap=i(e/g),this.sLeft=new n(c,b,c,a),this.sRight=new n(d,b,d,a))}getNextLine(){if(1e-4>i(this.sinAngle)){if(this.pos<this.right){let a=[this.pos,this.top,this.pos,this.bottom];return this.pos+=this.gap,a}}else if(!(.9999<i(this.sinAngle))){let b=this.pos-this.deltaX/2,c=this.pos+this.deltaX/2,d=this.bottom,e=this.top;if(this.pos<this.right+this.deltaX){for(;b<this.left&&c<this.left||b>this.right&&c>this.right;)if(this.pos+=this.hGap,b=this.pos-this.deltaX/2,c=this.pos+this.deltaX/2,this.pos>this.right+this.deltaX)return null;let f=new n(b,d,c,e);f.compare(this.sLeft)==a().INTERSECTS&&(b=f.xi,d=f.yi),f.compare(this.sRight)==a().INTERSECTS&&(c=f.xi,e=f.yi),0<this.tanAngle&&(b=this.right-(b-this.left),c=this.right-(c-this.left));let g=[b,d,c,e];return this.pos+=this.hGap,g}}else if(this.pos<this.bottom){let a=[this.left,this.pos,this.right,this.pos];return this.pos+=this.gap,a}return null}}class o{constructor(a,b){this.type=a,this.text=b}isType(a){return this.type===a}}class q{constructor(a){this.PARAMS={A:["rx","ry","x-axis-rotation","large-arc-flag","sweep-flag","x","y"],a:["rx","ry","x-axis-rotation","large-arc-flag","sweep-flag","x","y"],C:["x1","y1","x2","y2","x","y"],c:["x1","y1","x2","y2","x","y"],H:["x"],h:["x"],L:["x","y"],l:["x","y"],M:["x","y"],m:["x","y"],Q:["x1","y1","x","y"],q:["x1","y1","x","y"],S:["x2","y2","x","y"],s:["x2","y2","x","y"],T:["x","y"],t:["x","y"],V:["y"],v:["y"],Z:[],z:[]},this.COMMAND=0,this.NUMBER=1,this.EOD=2,this.segments=[],this.d=a||"",this.parseData(a),this.processPoints()}loadFromSegments(a){this.segments=a,this.processPoints()}processPoints(){let a=null,b=[0,0];for(let c,d=0;d<this.segments.length;d++){switch(c=this.segments[d],c.key){case"M":case"L":case"T":c.point=[c.data[0],c.data[1]];break;case"m":case"l":case"t":c.point=[c.data[0]+b[0],c.data[1]+b[1]];break;case"H":c.point=[c.data[0],b[1]];break;case"h":c.point=[c.data[0]+b[0],b[1]];break;case"V":c.point=[b[0],c.data[0]];break;case"v":c.point=[b[0],c.data[0]+b[1]];break;case"z":case"Z":a&&(c.point=[a[0],a[1]]);break;case"C":c.point=[c.data[4],c.data[5]];break;case"c":c.point=[c.data[4]+b[0],c.data[5]+b[1]];break;case"S":c.point=[c.data[2],c.data[3]];break;case"s":c.point=[c.data[2]+b[0],c.data[3]+b[1]];break;case"Q":c.point=[c.data[2],c.data[3]];break;case"q":c.point=[c.data[2]+b[0],c.data[3]+b[1]];break;case"A":c.point=[c.data[5],c.data[6]];break;case"a":c.point=[c.data[5]+b[0],c.data[6]+b[1]];}("m"===c.key||"M"===c.key)&&(a=null),c.point&&(b=c.point,!a&&(a=c.point)),("z"===c.key||"Z"===c.key)&&(a=null)}}get closed(){if("undefined"==typeof this._closed){this._closed=!1;for(let a of this.segments)"z"===a.key.toLowerCase()&&(this._closed=!0)}return this._closed}parseData(a){var b=this.tokenize(a),c=0,d=b[c],e="BOD";for(this.segments=[];!d.isType(this.EOD);){var f,g=[];if(!("BOD"==e))d.isType(this.NUMBER)?f=this.PARAMS[e].length:(c++,f=this.PARAMS[d.text].length,e=d.text);else if("M"==d.text||"m"==d.text)c++,f=this.PARAMS[d.text].length,e=d.text;else return this.parseData("M0,0"+a);if(c+f<b.length){for(var h,j=c;j<c+f;j++)if(h=b[j],h.isType(this.NUMBER))g[g.length]=h.text;else return void console.error("Parameter type is not a number: "+e+","+h.text);var i;if(this.PARAMS[e])i={key:e,data:g};else return void console.error("Unsupported segment type: "+e);this.segments.push(i),c+=f,d=b[c],"M"==e&&(e="L"),"m"==e&&(e="l")}else console.error("Path data ended before all parameters were found")}}tokenize(a){for(var b=[];""!=a;)if(a.match(/^([ \t\r\n,]+)/))a=a.substr(RegExp.$1.length);else if(a.match(/^([aAcChHlLmMqQsStTvVzZ])/))b[b.length]=new o(this.COMMAND,RegExp.$1),a=a.substr(RegExp.$1.length);else if(a.match(/^(([-+]?[0-9]+(\.[0-9]*)?|[-+]?\.[0-9]+)([eE][-+]?[0-9]+)?)/))b[b.length]=new o(this.NUMBER,parseFloat(RegExp.$1)),a=a.substr(RegExp.$1.length);else return console.error("Unrecognized segment command: "+a),null;return b[b.length]=new o(this.EOD,null),b}}class r{constructor(a){this.d=a,this.parsed=new q(a),this._position=[0,0],this.bezierReflectionPoint=null,this.quadReflectionPoint=null,this._first=null}get segments(){return this.parsed.segments}get closed(){return this.parsed.closed}get linearPoints(){if(!this._linearPoints){const a=[];let b=[];for(let c of this.parsed.segments){let d=c.key.toLowerCase();("m"===d||"z"===d)&&(b.length&&(a.push(b),b=[]),"z"===d)||c.point&&b.push(c.point)}b.length&&(a.push(b),b=[]),this._linearPoints=a}return this._linearPoints}get first(){return this._first}set first(a){this._first=a}setPosition(a,b){this._position=[a,b],this._first||(this._first=[a,b])}get position(){return this._position}get x(){return this._position[0]}get y(){return this._position[1]}}class s{constructor(a,b,c,d,e,k){const l=h/180;if(this._segIndex=0,this._numSegs=0,a[0]==b[0]&&a[1]==b[1])return;this._rx=i(c[0]),this._ry=i(c[1]),this._sinPhi=g(d*l),this._cosPhi=f(d*l);var m,n=this._cosPhi*(a[0]-b[0])/2+this._sinPhi*(a[1]-b[1])/2,o=-this._sinPhi*(a[0]-b[0])/2+this._cosPhi*(a[1]-b[1])/2,p=this._rx*this._rx*this._ry*this._ry-this._rx*this._rx*o*o-this._ry*this._ry*n*n;if(0>p){let a=j(1-p/(this._rx*this._rx*this._ry*this._ry));this._rx=a,this._ry=a,m=0}else m=(e==k?-1:1)*j(p/(this._rx*this._rx*o*o+this._ry*this._ry*n*n));let q=m*this._rx*o/this._ry,r=-m*this._ry*n/this._rx;this._C=[0,0],this._C[0]=this._cosPhi*q-this._sinPhi*r+(a[0]+b[0])/2,this._C[1]=this._sinPhi*q+this._cosPhi*r+(a[1]+b[1])/2,this._theta=this.calculateVectorAngle(1,0,(n-q)/this._rx,(o-r)/this._ry);let s=this.calculateVectorAngle((n-q)/this._rx,(o-r)/this._ry,(-n-q)/this._rx,(-o-r)/this._ry);!k&&0<s?s-=2*h:k&&0>s&&(s+=2*h),this._numSegs=Math.ceil(i(s/(h/2))),this._delta=s/this._numSegs,this._T=8/3*g(this._delta/4)*g(this._delta/4)/g(this._delta/2),this._from=a}getNextSegment(){var a,b,c;if(this._segIndex==this._numSegs)return null;let d=f(this._theta),e=g(this._theta),h=this._theta+this._delta,i=f(h),j=g(h);return c=[this._cosPhi*this._rx*i-this._sinPhi*this._ry*j+this._C[0],this._sinPhi*this._rx*i+this._cosPhi*this._ry*j+this._C[1]],a=[this._from[0]+this._T*(-this._cosPhi*this._rx*e-this._sinPhi*this._ry*d),this._from[1]+this._T*(-this._sinPhi*this._rx*e+this._cosPhi*this._ry*d)],b=[c[0]+this._T*(this._cosPhi*this._rx*j+this._sinPhi*this._ry*i),c[1]+this._T*(this._sinPhi*this._rx*j-this._cosPhi*this._ry*i)],this._theta=h,this._from=[c[0],c[1]],this._segIndex++,{cp1:a,cp2:b,to:c}}calculateVectorAngle(a,b,c,d){var e=Math.atan2;let f=e(b,a),g=e(d,c);return g>=f?g-f:2*h-(f-g)}}class t{constructor(a,b){this.sets=a,this.closed=b}fit(a){let b=[];for(const c of this.sets){let d=c.length,f=e(a*d);if(5>f){if(5>=d)continue;f=5}b.push(this.reduce(c,f))}let c="";for(const d of b){for(let a,b=0;b<d.length;b++)a=d[b],c+=0===b?"M"+a[0]+","+a[1]:"L"+a[0]+","+a[1];this.closed&&(c+="z ")}return c}distance(a,b){return j(d(a[0]-b[0],2)+d(a[1]-b[1],2))}reduce(a,b){if(a.length<=b)return a;let d=a.slice(0);for(;d.length>b;){let e=-1,f=-1;for(let g=1;g<d.length-1;g++){let h=this.distance(d[g-1],d[g]),a=this.distance(d[g],d[g+1]),b=this.distance(d[g-1],d[g+1]),c=(h+a+b)/2,i=j(c*(c-h)*(c-a)*(c-b));(0>e||i<e)&&(e=i,f=g)}if(0<f)d.splice(f,1);else break}return d}}class u{line(a,b,c,d,e){let f=this._doubleLine(a,b,c,d,e);return{type:"path",ops:f}}linearPath(a,b,c){const d=(a||[]).length;if(2<d){let e=[];for(let b=0;b<d-1;b++)e=e.concat(this._doubleLine(a[b][0],a[b][1],a[b+1][0],a[b+1][1],c));return b&&(e=e.concat(this._doubleLine(a[d-1][0],a[d-1][1],a[0][0],a[0][1],c))),{type:"path",ops:e}}return 2===d?this.line(a[0][0],a[0][1],a[1][0],a[1][1],c):void 0}polygon(a,b){return this.linearPath(a,!0,b)}rectangle(a,b,c,d,e){return this.polygon([[a,b],[a+c,b],[a+c,b+d],[a,b+d]],e)}curve(a,b){let c=this._curveWithOffset(a,1*(1+.2*b.roughness),b),d=this._curveWithOffset(a,1.5*(1+.22*b.roughness),b);return{type:"path",ops:c.concat(d)}}ellipse(a,b,c,d,e){const f=2*h/e.curveStepCount;let g=i(c/2),j=i(d/2);g+=this._getOffset(.05*-g,.05*g,e),j+=this._getOffset(.05*-j,.05*j,e);let k=this._ellipse(f,a,b,g,j,1,f*this._getOffset(.1,this._getOffset(.4,1,e),e),e),l=this._ellipse(f,a,b,g,j,1.5,0,e);return{type:"path",ops:k.concat(l)}}arc(a,b,c,d,e,j,k,m,n){let o=a,p=b,q=i(c/2),r=i(d/2);q+=this._getOffset(.01*-q,.01*q,n),r+=this._getOffset(.01*-r,.01*r,n);let s=e,t=j;for(;0>s;)s+=2*h,t+=2*h;t-s>2*h&&(s=0,t=2*h);let u=2*h/n.curveStepCount,v=l(u/2,(t-s)/2),w=this._arc(v,o,p,q,r,s,t,1,n),x=this._arc(v,o,p,q,r,s,t,1.5,n),y=w.concat(x);return k&&(m?(y=y.concat(this._doubleLine(o,p,o+q*f(s),p+r*g(s),n)),y=y.concat(this._doubleLine(o,p,o+q*f(t),p+r*g(t),n))):(y.push({op:"lineTo",data:[o,p]}),y.push({op:"lineTo",data:[o+q*f(s),p+r*g(s)]}))),{type:"path",ops:y}}hachureFillArc(a,b,c,d,e,j,k){let l=a,m=b,n=i(c/2),o=i(d/2);n+=this._getOffset(.01*-n,.01*n,k),o+=this._getOffset(.01*-o,.01*o,k);let p=e,q=j;for(;0>p;)p+=2*h,q+=2*h;q-p>2*h&&(p=0,q=2*h);let r=(q-p)/k.curveStepCount,s=[],t=[];for(let h=p;h<=q;h+=r)s.push(l+n*f(h)),t.push(m+o*g(h));return s.push(l+n*f(q)),t.push(m+o*g(q)),s.push(l),t.push(m),this.hachureFillShape(s,t,k)}solidFillShape(a,b,c){let d=[];if(a&&b&&a.length&&b.length&&a.length===b.length){let f=c.maxRandomnessOffset||0;const g=a.length;if(2<g){d.push({op:"move",data:[a[0]+this._getOffset(-f,f,c),b[0]+this._getOffset(-f,f,c)]});for(var e=1;e<g;e++)d.push({op:"lineTo",data:[a[e]+this._getOffset(-f,f,c),b[e]+this._getOffset(-f,f,c)]})}}return{type:"fillPath",ops:d}}hachureFillShape(a,b,d){let e=[];if(a&&b&&a.length&&b.length){let j=a[0],m=a[0],n=b[0],o=b[0];for(let c=1;c<a.length;c++)j=l(j,a[c]),m=k(m,a[c]),n=l(n,b[c]),o=k(o,b[c]);const i=d.hachureAngle;let q=d.hachureGap;0>q&&(q=4*d.strokeWidth),q=k(q,.1);const r=i%180*(h/180),s=f(r),t=g(r),u=c(r),v=new p(n-1,o+1,j-1,m+1,q,t,s,u);for(let c;null!=(c=v.getNextLine());){let f=this._getIntersectingLines(c,a,b);for(let a=0;a<f.length;a++)if(a<f.length-1){let b=f[a],c=f[a+1];e=e.concat(this._doubleLine(b[0],b[1],c[0],c[1],d))}}}return{type:"fillSketch",ops:e}}hachureFillEllipse(a,b,d,e,f){let g=[],k=i(d/2),l=i(e/2);k+=this._getOffset(.05*-k,.05*k,f),l+=this._getOffset(.05*-l,.05*l,f);let m=f.hachureAngle,n=f.hachureGap;0>=n&&(n=4*f.strokeWidth);let o=f.fillWeight;0>o&&(o=f.strokeWidth/2);let p=c(m%180*(h/180)),q=l/k,r=j(q*p*q*p+1),s=q*p/r,t=1/r,u=n/(k*l/j(l*t*(l*t)+k*s*(k*s))/k),v=j(k*k-(a-k+u)*(a-k+u));for(var w=a-k+u;w<a+k;w+=u){v=j(k*k-(a-w)*(a-w));let c=this._affine(w,b-v,a,b,s,t,q),d=this._affine(w,b+v,a,b,s,t,q);g=g.concat(this._doubleLine(c[0],c[1],d[0],d[1],f))}return{type:"fillSketch",ops:g}}svgPath(a,b){a=(a||"").replace(/\n/g," ").replace(/(-\s)/g,"-").replace("/(ss)/g"," ");let c=new r(a);if(b.simplification){let a=new t(c.linearPoints,c.closed),e=a.fit(b.simplification);c=new r(e)}let d=[],e=c.segments||[];for(let f=0;f<e.length;f++){let a=e[f],g=0<f?e[f-1]:null,h=this._processSegment(c,a,g,b);h&&h.length&&(d=d.concat(h))}return{type:"path",ops:d}}_bezierTo(a,b,c,d,e,g,h,j){let k=[],l=[j.maxRandomnessOffset||1,(j.maxRandomnessOffset||1)+.5],m=null;for(let f=0;2>f;f++)0===f?k.push({op:"move",data:[h.x,h.y]}):k.push({op:"move",data:[h.x+this._getOffset(-l[0],l[0],j),h.y+this._getOffset(-l[0],l[0],j)]}),m=[e+this._getOffset(-l[f],l[f],j),g+this._getOffset(-l[f],l[f],j)],k.push({op:"bcurveTo",data:[a+this._getOffset(-l[f],l[f],j),b+this._getOffset(-l[f],l[f],j),c+this._getOffset(-l[f],l[f],j),d+this._getOffset(-l[f],l[f],j),m[0],m[1]]});return h.setPosition(m[0],m[1]),k}_processSegment(a,b,c,d){let e=[];switch(b.key){case"M":case"m":{let c="m"===b.key;if(2<=b.data.length){let f=+b.data[0],g=+b.data[1];c&&(f+=a.x,g+=a.y);let h=1*(d.maxRandomnessOffset||0);f+=this._getOffset(-h,h,d),g+=this._getOffset(-h,h,d),a.setPosition(f,g),e.push({op:"move",data:[f,g]})}break}case"L":case"l":{let c="l"===b.key;if(2<=b.data.length){let f=+b.data[0],g=+b.data[1];c&&(f+=a.x,g+=a.y),e=e.concat(this._doubleLine(a.x,a.y,f,g,d)),a.setPosition(f,g)}break}case"H":case"h":{const c="h"===b.key;if(b.data.length){let f=+b.data[0];c&&(f+=a.x),e=e.concat(this._doubleLine(a.x,a.y,f,a.y,d)),a.setPosition(f,a.y)}break}case"V":case"v":{const c="v"===b.key;if(b.data.length){let f=+b.data[0];c&&(f+=a.y),e=e.concat(this._doubleLine(a.x,a.y,a.x,f,d)),a.setPosition(a.x,f)}break}case"Z":case"z":{a.first&&(e=e.concat(this._doubleLine(a.x,a.y,a.first[0],a.first[1],d)),a.setPosition(a.first[0],a.first[1]),a.first=null);break}case"C":case"c":{const c="c"===b.key;if(6<=b.data.length){let f=+b.data[0],g=+b.data[1],h=+b.data[2],i=+b.data[3],j=+b.data[4],k=+b.data[5];c&&(f+=a.x,h+=a.x,j+=a.x,g+=a.y,i+=a.y,k+=a.y);let l=this._bezierTo(f,g,h,i,j,k,a,d);e=e.concat(l),a.bezierReflectionPoint=[j+(j-h),k+(k-i)]}break}case"S":case"s":{const f="s"===b.key;if(4<=b.data.length){let h=+b.data[0],i=+b.data[1],j=+b.data[2],k=+b.data[3];f&&(h+=a.x,j+=a.x,i+=a.y,k+=a.y);let l=h,m=i,n=c?c.key:"";var g=null;("c"==n||"C"==n||"s"==n||"S"==n)&&(g=a.bezierReflectionPoint),g&&(l=g[0],m=g[1]);let o=this._bezierTo(l,m,h,i,j,k,a,d);e=e.concat(o),a.bezierReflectionPoint=[j+(j-h),k+(k-i)]}break}case"Q":case"q":{const c="q"===b.key;if(4<=b.data.length){let g=+b.data[0],h=+b.data[1],i=+b.data[2],j=+b.data[3];c&&(g+=a.x,i+=a.x,h+=a.y,j+=a.y);let k=1*(1+.2*d.roughness),l=1.5*(1+.22*d.roughness);e.push({op:"move",data:[a.x+this._getOffset(-k,k,d),a.y+this._getOffset(-k,k,d)]});let m=[i+this._getOffset(-k,k,d),j+this._getOffset(-k,k,d)];e.push({op:"qcurveTo",data:[g+this._getOffset(-k,k,d),h+this._getOffset(-k,k,d),m[0],m[1]]}),e.push({op:"move",data:[a.x+this._getOffset(-l,l,d),a.y+this._getOffset(-l,l,d)]}),m=[i+this._getOffset(-l,l,d),j+this._getOffset(-l,l,d)],e.push({op:"qcurveTo",data:[g+this._getOffset(-l,l,d),h+this._getOffset(-l,l,d),m[0],m[1]]}),a.setPosition(m[0],m[1]),a.quadReflectionPoint=[i+(i-g),j+(j-h)]}break}case"T":case"t":{const h="t"===b.key;if(2<=b.data.length){let i=+b.data[0],j=+b.data[1];h&&(i+=a.x,j+=a.y);let k=i,l=j,m=c?c.key:"";var g=null;("q"==m||"Q"==m||"t"==m||"T"==m)&&(g=a.quadReflectionPoint),g&&(k=g[0],l=g[1]);let n=1*(1+.2*d.roughness),o=1.5*(1+.22*d.roughness);e.push({op:"move",data:[a.x+this._getOffset(-n,n,d),a.y+this._getOffset(-n,n,d)]});let p=[i+this._getOffset(-n,n,d),j+this._getOffset(-n,n,d)];e.push({op:"qcurveTo",data:[k+this._getOffset(-n,n,d),l+this._getOffset(-n,n,d),p[0],p[1]]}),e.push({op:"move",data:[a.x+this._getOffset(-o,o,d),a.y+this._getOffset(-o,o,d)]}),p=[i+this._getOffset(-o,o,d),j+this._getOffset(-o,o,d)],e.push({op:"qcurveTo",data:[k+this._getOffset(-o,o,d),l+this._getOffset(-o,o,d),p[0],p[1]]}),a.setPosition(p[0],p[1]),a.quadReflectionPoint=[i+(i-k),j+(j-l)]}break}case"A":case"a":{const c="a"===b.key;if(7<=b.data.length){let f=+b.data[0],g=+b.data[1],h=+b.data[2],i=+b.data[3],j=+b.data[4],k=+b.data[5],l=+b.data[6];if(c&&(k+=a.x,l+=a.y),k==a.x&&l==a.y)break;if(0==f||0==g)e=e.concat(this._doubleLine(a.x,a.y,k,l,d)),a.setPosition(k,l);else{d.maxRandomnessOffset||0;for(let b=0;1>b;b++){let b=new s([a.x,a.y],[k,l],[f,g],h,!!i,!!j),c=b.getNextSegment();for(;c;){let f=this._bezierTo(c.cp1[0],c.cp1[1],c.cp2[0],c.cp2[1],c.to[0],c.to[1],a,d);e=e.concat(f),c=b.getNextSegment()}}}}break}default:}return e}_getOffset(a,b,c){return c.roughness*(Math.random()*(b-a)+a)}_affine(a,b,c,d,e,f,g){return[-c*f-d*e+c+f*a+e*b,g*(c*e-d*f)+d+-g*e*a+g*f*b]}_doubleLine(a,b,c,d,e){const f=this._line(a,b,c,d,e,!0,!1),g=this._line(a,b,c,d,e,!0,!0);return f.concat(g)}_line(a,b,c,e,f,g,h){const i=d(a-c,2)+d(b-e,2);let k=f.maxRandomnessOffset||0;100*(k*k)>i&&(k=j(i)/10);const l=k/2,m=.2+.2*Math.random();let n=f.bowing*f.maxRandomnessOffset*(e-b)/200,o=f.bowing*f.maxRandomnessOffset*(a-c)/200;n=this._getOffset(-n,n,f),o=this._getOffset(-o,o,f);let p=[];return g&&(h?p.push({op:"move",data:[a+this._getOffset(-l,l,f),b+this._getOffset(-l,l,f)]}):p.push({op:"move",data:[a+this._getOffset(-k,k,f),b+this._getOffset(-k,k,f)]})),h?p.push({op:"bcurveTo",data:[n+a+(c-a)*m+this._getOffset(-l,l,f),o+b+(e-b)*m+this._getOffset(-l,l,f),n+a+2*(c-a)*m+this._getOffset(-l,l,f),o+b+2*(e-b)*m+this._getOffset(-l,l,f),c+this._getOffset(-l,l,f),e+this._getOffset(-l,l,f)]}):p.push({op:"bcurveTo",data:[n+a+(c-a)*m+this._getOffset(-k,k,f),o+b+(e-b)*m+this._getOffset(-k,k,f),n+a+2*(c-a)*m+this._getOffset(-k,k,f),o+b+2*(e-b)*m+this._getOffset(-k,k,f),c+this._getOffset(-k,k,f),e+this._getOffset(-k,k,f)]}),p}_curve(a,c,d){const e=a.length;let f=[];if(3<e){const g=[],b=1-d.curveTightness;f.push({op:"move",data:[a[1][0],a[1][1]]});for(let c=1;c+2<e;c++){const d=a[c];g[0]=[d[0],d[1]],g[1]=[d[0]+(b*a[c+1][0]-b*a[c-1][0])/6,d[1]+(b*a[c+1][1]-b*a[c-1][1])/6],g[2]=[a[c+1][0]+(b*a[c][0]-b*a[c+2][0])/6,a[c+1][1]+(b*a[c][1]-b*a[c+2][1])/6],g[3]=[a[c+1][0],a[c+1][1]],f.push({op:"bcurveTo",data:[g[1][0],g[1][1],g[2][0],g[2][1],g[3][0],g[3][1]]})}if(c&&2===c.length){let a=d.maxRandomnessOffset;f.push({ops:"lineTo",data:[c[0]+this._getOffset(-a,a,d),c[1]+ +this._getOffset(-a,a,d)]})}}else 3===e?(f.push({op:"move",data:[a[1][0],a[1][1]]}),f.push({op:"bcurveTo",data:[a[1][0],a[1][1],a[2][0],a[2][1],a[2][0],a[2][1]]})):2===e&&(f=f.concat(this._doubleLine(a[0][0],a[0][1],a[1][0],a[1][1],d)));return f}_ellipse(a,b,c,d,e,i,j,k){const l=this._getOffset(-.5,.5,k)-h/2,m=[];m.push([this._getOffset(-i,i,k)+b+.9*d*f(l-a),this._getOffset(-i,i,k)+c+.9*e*g(l-a)]);for(let n=l;n<2*h+l-.01;n+=a)m.push([this._getOffset(-i,i,k)+b+d*f(n),this._getOffset(-i,i,k)+c+e*g(n)]);return m.push([this._getOffset(-i,i,k)+b+d*f(l+2*h+.5*j),this._getOffset(-i,i,k)+c+e*g(l+2*h+.5*j)]),m.push([this._getOffset(-i,i,k)+b+.98*d*f(l+j),this._getOffset(-i,i,k)+c+.98*e*g(l+j)]),m.push([this._getOffset(-i,i,k)+b+.9*d*f(l+.5*j),this._getOffset(-i,i,k)+c+.9*e*g(l+.5*j)]),this._curve(m,null,k)}_curveWithOffset(a,b,c){const d=[[a[0][0]+this._getOffset(-b,b,c),a[0][1]+this._getOffset(-b,b,c)],[a[0][0]+this._getOffset(-b,b,c),a[0][1]+this._getOffset(-b,b,c)]];for(let e=1;e<a.length;e++)d.push([a[e][0]+this._getOffset(-b,b,c),a[e][1]+this._getOffset(-b,b,c)]),e===a.length-1&&d.push([a[e][0]+this._getOffset(-b,b,c),a[e][1]+this._getOffset(-b,b,c)]);return this._curve(d,null,c)}_arc(a,b,c,d,e,h,i,j,k){const l=h+this._getOffset(-.1,.1,k),m=[];m.push([this._getOffset(-j,j,k)+b+.9*d*f(l-a),this._getOffset(-j,j,k)+c+.9*e*g(l-a)]);for(let n=l;n<=i;n+=a)m.push([this._getOffset(-j,j,k)+b+d*f(n),this._getOffset(-j,j,k)+c+e*g(n)]);return m.push([b+d*f(i),c+e*g(i)]),m.push([b+d*f(i),c+e*g(i)]),this._curve(m,null,k)}_getIntersectingLines(b,c,d){let e=[];for(var f=new n(b[0],b[1],b[2],b[3]),g=0;g<c.length;g++){let b=new n(c[g],d[g],c[(g+1)%c.length],d[(g+1)%c.length]);f.compare(b)==a().INTERSECTS&&e.push([f.xi,f.yi])}return e}}self._roughScript=self.document&&self.document.currentScript&&self.document.currentScript.src;class v{constructor(a,b){this.config=a||{},this.canvas=b,this.defaultOptions={maxRandomnessOffset:2,roughness:1,bowing:1,stroke:"#000",strokeWidth:1,curveTightness:0,curveStepCount:9,fill:null,fillStyle:"hachure",fillWeight:-1,hachureAngle:-41,hachureGap:-1},this.config.options&&(this.defaultOptions=this._options(this.config.options))}_options(a){return a?Object.assign({},this.defaultOptions,a):this.defaultOptions}_drawable(a,b,c){return{shape:a,sets:b||[],options:c||this.defaultOptions}}get lib(){if(!this._renderer)if(self&&self.workly&&this.config.async&&!this.config.noWorker){const a=Function.prototype.toString,b=this.config.worklyURL||"https://cdn.jsdelivr.net/gh/pshihn/workly/dist/workly.min.js",c=this.config.roughURL||self._roughScript;if(c&&b){let a=`importScripts('${b}', '${c}');\nworkly.expose(self.rough.createRenderer());`,d=URL.createObjectURL(new Blob([a]));this._renderer=workly.proxy(d)}else this._renderer=new u}else this._renderer=new u;return this._renderer}line(a,b,c,d,e){const f=this._options(e);return this._drawable("line",[this.lib.line(a,b,c,d,f)],f)}rectangle(a,b,c,d,e){const f=this._options(e),g=[];if(f.fill){const e=[a,a+c,a+c,a],h=[b,b,b+d,b+d];"solid"===f.fillStyle?g.push(this.lib.solidFillShape(e,h,f)):g.push(this.lib.hachureFillShape(e,h,f))}return g.push(this.lib.rectangle(a,b,c,d,f)),this._drawable("rectangle",g,f)}ellipse(a,b,c,d,e){const f=this._options(e),g=[];if(f.fill)if("solid"===f.fillStyle){const e=this.lib.ellipse(a,b,c,d,f);e.type="fillPath",g.push(e)}else g.push(this.lib.hachureFillEllipse(a,b,c,d,f));return g.push(this.lib.ellipse(a,b,c,d,f)),this._drawable("ellipse",g,f)}circle(a,b,c,d){let e=this.ellipse(a,b,c,c,d);return e.shape="circle",e}linearPath(a,b){const c=this._options(b);return this._drawable("linearPath",[this.lib.linearPath(a,!1,c)],c)}polygon(a,b){const c=this._options(b),d=[];if(c.fill){let b=[],e=[];for(let c of a)b.push(c[0]),e.push(c[1]);"solid"===c.fillStyle?d.push(this.lib.solidFillShape(b,e,c)):d.push(this.lib.hachureFillShape(b,e,c))}return d.push(this.lib.linearPath(a,!0,c)),this._drawable("polygon",d,c)}arc(a,b,c,d,e,f,g,h){const i=this._options(h),j=[];if(g&&i.fill)if("solid"===i.fillStyle){let g=this.lib.arc(a,b,c,d,e,f,!0,!1,i);g.type="fillPath",j.push(g)}else j.push(this.lib.hachureFillArc(a,b,c,d,e,f,i));return j.push(this.lib.arc(a,b,c,d,e,f,g,!0,i)),this._drawable("arc",j,i)}curve(a,b){const c=this._options(b);return this._drawable("curve",[this.lib.curve(a,c)],c)}path(a,b){const c=this._options(b),e=[];if(!a)return this._drawable("path",e,c);if(c.fill)if("solid"===c.fillStyle){e.push({type:"path2Dfill",path:a})}else{const b=this._computePathSize(a);let d=[0,b[0],b[0],0],f=[0,0,b[1],b[1]],g=this.lib.hachureFillShape(d,f,c);g.type="path2Dpattern",g.size=b,g.path=a,e.push(g)}return e.push(this.lib.svgPath(a,c)),this._drawable("path",e,c)}toPaths(a){const c=a.sets||[],d=a.options||this.defaultOptions,e=[];for(const f of c){let a=null;switch(f.type){case"path":a={d:this.opsToPath(f),stroke:d.stroke,strokeWidth:d.strokeWidth,fill:"none"};break;case"fillPath":a={d:this.opsToPath(f),stroke:"none",strokeWidth:0,fill:d.fill};break;case"fillSketch":a=this._fillSketch(f,d);break;case"path2Dfill":a={d:f.path,stroke:"none",strokeWidth:0,fill:d.fill};break;case"path2Dpattern":{const c=f.size,e={x:0,y:0,width:1,height:1,viewBox:`0 0 ${b(c[0])} ${b(c[1])}`,patternUnits:"objectBoundingBox",path:this._fillSketch(f,d)};a={d:f.path,stroke:"none",strokeWidth:0,pattern:e};break}}a&&e.push(a)}return e}_fillSketch(a,b){let c=b.fillWeight;return 0>c&&(c=b.strokeWidth/2),{d:this.opsToPath(a),stroke:b.fill,strokeWidth:c,fill:"none"}}opsToPath(a){let b="";for(let c of a.ops){const a=c.data;switch(c.op){case"move":b+=`M${a[0]} ${a[1]} `;break;case"bcurveTo":b+=`C${a[0]} ${a[1]}, ${a[2]} ${a[3]}, ${a[4]} ${a[5]} `;break;case"qcurveTo":b+=`Q${a[0]} ${a[1]}, ${a[2]} ${a[3]} `;break;case"lineTo":b+=`L${a[0]} ${a[1]} `;}}return b.trim()}_computePathSize(a){let b=[0,0];if(self.document)try{const c="http://www.w3.org/2000/svg";let d=self.document.createElementNS(c,"svg");d.setAttribute("width","0"),d.setAttribute("height","0");let e=self.document.createElementNS(c,"path");e.setAttribute("d",a),d.appendChild(e),self.document.body.appendChild(d);let f=e.getBBox();f&&(b[0]=f.width||0,b[1]=f.height||0),self.document.body.removeChild(d)}catch(a){}const c=this._canvasSize();return b[0]*b[1]||(b=c),b[0]=l(b[0],c[0]),b[1]=l(b[1],c[1]),b}_canvasSize(){const a=(a)=>a&&"object"==typeof a&&a.baseVal&&a.baseVal.value?a.baseVal.value:a||100;return this.canvas?[a(this.canvas.width),a(this.canvas.height)]:[100,100]}}class w extends v{async line(a,b,c,d,e){const f=this._options(e);return this._drawable("line",[await this.lib.line(a,b,c,d,f)],f)}async rectangle(a,b,c,d,e){const f=this._options(e),g=[];if(f.fill){const e=[a,a+c,a+c,a],h=[b,b,b+d,b+d];"solid"===f.fillStyle?g.push((await this.lib.solidFillShape(e,h,f))):g.push((await this.lib.hachureFillShape(e,h,f)))}return g.push((await this.lib.rectangle(a,b,c,d,f))),this._drawable("rectangle",g,f)}async ellipse(a,b,c,d,e){const f=this._options(e),g=[];if(f.fill)if("solid"===f.fillStyle){const e=await this.lib.ellipse(a,b,c,d,f);e.type="fillPath",g.push(e)}else g.push((await this.lib.hachureFillEllipse(a,b,c,d,f)));return g.push((await this.lib.ellipse(a,b,c,d,f))),this._drawable("ellipse",g,f)}async circle(a,b,c,d){let e=await this.ellipse(a,b,c,c,d);return e.shape="circle",e}async linearPath(a,b){const c=this._options(b);return this._drawable("linearPath",[await this.lib.linearPath(a,!1,c)],c)}async polygon(a,b){const c=this._options(b),d=[];if(c.fill){let b=[],e=[];for(let c of a)b.push(c[0]),e.push(c[1]);"solid"===c.fillStyle?d.push((await this.lib.solidFillShape(b,e,c))):d.push((await this.lib.hachureFillShape(b,e,c)))}return d.push((await this.lib.linearPath(a,!0,c))),this._drawable("polygon",d,c)}async arc(a,b,c,d,e,f,g,h){const i=this._options(h),j=[];if(g&&i.fill)if("solid"===i.fillStyle){let g=await this.lib.arc(a,b,c,d,e,f,!0,!1,i);g.type="fillPath",j.push(g)}else j.push((await this.lib.hachureFillArc(a,b,c,d,e,f,i)));return j.push((await this.lib.arc(a,b,c,d,e,f,g,!0,i))),this._drawable("arc",j,i)}async curve(a,b){const c=this._options(b);return this._drawable("curve",[await this.lib.curve(a,c)],c)}async path(a,b){const c=this._options(b),e=[];if(!a)return this._drawable("path",e,c);if(c.fill)if("solid"===c.fillStyle){e.push({type:"path2Dfill",path:a})}else{const b=this._computePathSize(a);let d=[0,b[0],b[0],0],f=[0,0,b[1],b[1]],g=await this.lib.hachureFillShape(d,f,c);g.type="path2Dpattern",g.size=b,g.path=a,e.push(g)}return e.push((await this.lib.svgPath(a,c))),this._drawable("path",e,c)}}class x{constructor(a,b){this.canvas=a,this.ctx=this.canvas.getContext("2d"),this._init(b)}_init(a){this.gen=new v(a,this.canvas)}get generator(){return this.gen}static createRenderer(){return new u}line(a,b,c,e,f){let g=this.gen.line(a,b,c,e,f);return this.draw(g),g}rectangle(a,b,c,e,f){let g=this.gen.rectangle(a,b,c,e,f);return this.draw(g),g}ellipse(a,b,c,e,f){let g=this.gen.ellipse(a,b,c,e,f);return this.draw(g),g}circle(a,b,c,e){let f=this.gen.circle(a,b,c,e);return this.draw(f),f}linearPath(a,b){let c=this.gen.linearPath(a,b);return this.draw(c),c}polygon(a,b){let c=this.gen.polygon(a,b);return this.draw(c),c}arc(a,b,c,e,f,g,h,i){let j=this.gen.arc(a,b,c,e,f,g,h,i);return this.draw(j),j}curve(a,b){let c=this.gen.curve(a,b);return this.draw(c),c}path(a,b){let c=this.gen.path(a,b);return this.draw(c),c}draw(a){let b=a.sets||[],c=a.options||this.gen.defaultOptions,d=this.ctx;for(let e of b)switch(e.type){case"path":d.save(),d.strokeStyle=c.stroke,d.lineWidth=c.strokeWidth,this._drawToContext(d,e),d.restore();break;case"fillPath":d.save(),d.fillStyle=c.fill,this._drawToContext(d,e,c),d.restore();break;case"fillSketch":this._fillSketch(d,e,c);break;case"path2Dfill":{this.ctx.save(),this.ctx.fillStyle=c.fill;let a=new Path2D(e.path);this.ctx.fill(a),this.ctx.restore();break}case"path2Dpattern":{let a=e.size;const b=document.createElement("canvas"),d=b.getContext("2d");let f=this._computeBBox(e.path);f&&(f.width||f.height)?(b.width=this.canvas.width,b.height=this.canvas.height,d.translate(f.x||0,f.y||0)):(b.width=a[0],b.height=a[1]),this._fillSketch(d,e,c),this.ctx.save(),this.ctx.fillStyle=this.ctx.createPattern(b,"repeat");let g=new Path2D(e.path);this.ctx.fill(g),this.ctx.restore();break}}}_computeBBox(a){if(self.document)try{const b="http://www.w3.org/2000/svg";let c=self.document.createElementNS(b,"svg");c.setAttribute("width","0"),c.setAttribute("height","0");let d=self.document.createElementNS(b,"path");d.setAttribute("d",a),c.appendChild(d),self.document.body.appendChild(c);let e=d.getBBox();return self.document.body.removeChild(c),e}catch(a){}return null}_fillSketch(a,b,c){let d=c.fillWeight;0>d&&(d=c.strokeWidth/2),a.save(),a.strokeStyle=c.fill,a.lineWidth=d,this._drawToContext(a,b),a.restore()}_drawToContext(a,b){a.beginPath();for(let c of b.ops){const b=c.data;switch(c.op){case"move":a.moveTo(b[0],b[1]);break;case"bcurveTo":a.bezierCurveTo(b[0],b[1],b[2],b[3],b[4],b[5]);break;case"qcurveTo":a.quadraticCurveTo(b[0],b[1],b[2],b[3]);break;case"lineTo":a.lineTo(b[0],b[1]);}}"fillPath"===b.type?a.fill():a.stroke()}}class y extends x{_init(a){this.gen=new w(a,this.canvas)}async line(a,b,c,e,f){let g=await this.gen.line(a,b,c,e,f);return this.draw(g),g}async rectangle(a,b,c,e,f){let g=await this.gen.rectangle(a,b,c,e,f);return this.draw(g),g}async ellipse(a,b,c,e,f){let g=await this.gen.ellipse(a,b,c,e,f);return this.draw(g),g}async circle(a,b,c,e){let f=await this.gen.circle(a,b,c,e);return this.draw(f),f}async linearPath(a,b){let c=await this.gen.linearPath(a,b);return this.draw(c),c}async polygon(a,b){let c=await this.gen.polygon(a,b);return this.draw(c),c}async arc(a,b,c,e,f,g,h,i){let j=await this.gen.arc(a,b,c,e,f,g,h,i);return this.draw(j),j}async curve(a,b){let c=await this.gen.curve(a,b);return this.draw(c),c}async path(a,b){let c=await this.gen.path(a,b);return this.draw(c),c}}class z{constructor(a,b){this.svg=a,this._init(b)}_init(a){this.gen=new v(a,this.svg)}get generator(){return this.gen}get defs(){if(!this._defs){let a=this.svg.ownerDocument||document,b=a.createElementNS("http://www.w3.org/2000/svg","defs");this.svg.firstChild?this.svg.insertBefore(b,this.svg.firstChild):this.svg.appendChild(b),this._defs=b}return this._defs}line(a,b,c,e,f){let g=this.gen.line(a,b,c,e,f);return this.draw(g)}rectangle(a,b,c,e,f){let g=this.gen.rectangle(a,b,c,e,f);return this.draw(g)}ellipse(a,b,c,e,f){let g=this.gen.ellipse(a,b,c,e,f);return this.draw(g)}circle(a,b,c,e){let f=this.gen.circle(a,b,c,e);return this.draw(f)}linearPath(a,b){let c=this.gen.linearPath(a,b);return this.draw(c)}polygon(a,b){let c=this.gen.polygon(a,b);return this.draw(c)}arc(a,b,c,e,f,g,h,i){let j=this.gen.arc(a,b,c,e,f,g,h,i);return this.draw(j)}curve(a,b){let c=this.gen.curve(a,b);return this.draw(c)}path(a,b){let c=this.gen.path(a,b);return this.draw(c)}draw(a){let c=a.sets||[],d=a.options||this.gen.defaultOptions,f=this.svg.ownerDocument||document,h=f.createElementNS("http://www.w3.org/2000/svg","g");for(let g of c){let a=null;switch(g.type){case"path":{a=f.createElementNS("http://www.w3.org/2000/svg","path"),a.setAttribute("d",this._opsToPath(g)),a.style.stroke=d.stroke,a.style.strokeWidth=d.strokeWidth,a.style.fill="none";break}case"fillPath":{a=f.createElementNS("http://www.w3.org/2000/svg","path"),a.setAttribute("d",this._opsToPath(g)),a.style.stroke="none",a.style.strokeWidth=0,a.style.fill=d.fill;break}case"fillSketch":{a=this._fillSketch(f,g,d);break}case"path2Dfill":{a=f.createElementNS("http://www.w3.org/2000/svg","path"),a.setAttribute("d",g.path),a.style.stroke="none",a.style.strokeWidth=0,a.style.fill=d.fill;break}case"path2Dpattern":{const c=g.size,h=f.createElementNS("http://www.w3.org/2000/svg","pattern"),i=`rough-${e(Math.random()*(Number.MAX_SAFE_INTEGER||999999))}`;h.setAttribute("id",i),h.setAttribute("x",0),h.setAttribute("y",0),h.setAttribute("width",1),h.setAttribute("height",1),h.setAttribute("height",1),h.setAttribute("viewBox",`0 0 ${b(c[0])} ${b(c[1])}`),h.setAttribute("patternUnits","objectBoundingBox");const j=this._fillSketch(f,g,d);h.appendChild(j),this.defs.appendChild(h),a=f.createElementNS("http://www.w3.org/2000/svg","path"),a.setAttribute("d",g.path),a.style.stroke="none",a.style.strokeWidth=0,a.style.fill=`url(#${i})`;break}}a&&h.appendChild(a)}return h}_fillSketch(a,b,c){let d=c.fillWeight;0>d&&(d=c.strokeWidth/2);let e=a.createElementNS("http://www.w3.org/2000/svg","path");return e.setAttribute("d",this._opsToPath(b)),e.style.stroke=c.fill,e.style.strokeWidth=d,e.style.fill="none",e}_opsToPath(a){return this.gen.opsToPath(a)}}class A extends z{_init(a){this.gen=new w(a,this.svg)}async line(a,b,c,e,f){let g=await this.gen.line(a,b,c,e,f);return this.draw(g)}async rectangle(a,b,c,e,f){let g=await this.gen.rectangle(a,b,c,e,f);return this.draw(g)}async ellipse(a,b,c,e,f){let g=await this.gen.ellipse(a,b,c,e,f);return this.draw(g)}async circle(a,b,c,e){let f=await this.gen.circle(a,b,c,e);return this.draw(f)}async linearPath(a,b){let c=await this.gen.linearPath(a,b);return this.draw(c)}async polygon(a,b){let c=await this.gen.polygon(a,b);return this.draw(c)}async arc(a,b,c,e,f,g,h,i){let j=await this.gen.arc(a,b,c,e,f,g,h,i);return this.draw(j)}async curve(a,b){let c=await this.gen.curve(a,b);return this.draw(c)}async path(a,b){let c=await this.gen.path(a,b);return this.draw(c)}}var B={canvas(a,b){return b&&b.async?new y(a,b):new x(a,b)},svg(a,b){return b&&b.async?new A(a,b):new z(a,b)},createRenderer(){return x.createRenderer()},generator(a,b){return a&&a.async?new w(a,b):new v(a,b)}};return B}();
/*!
	Papa Parse
	v4.3.7
	https://github.com/mholt/PapaParse
	License: MIT
*/
!function(a,b){"function"==typeof define&&define.amd?define([],b):"object"==typeof module&&"undefined"!=typeof exports?module.exports=b():a.Papa=b()}(this,function(){"use strict";function a(a,b){b=b||{};var c=b.dynamicTyping||!1;if(r(c)&&(b.dynamicTypingFunction=c,c={}),b.dynamicTyping=c,b.worker&&z.WORKERS_SUPPORTED){var h=k();return h.userStep=b.step,h.userChunk=b.chunk,h.userComplete=b.complete,h.userError=b.error,b.step=r(b.step),b.chunk=r(b.chunk),b.complete=r(b.complete),b.error=r(b.error),delete b.worker,void h.postMessage({input:a,config:b,workerId:h.id})}var i=null;return"string"==typeof a?i=b.download?new d(b):new f(b):a.readable===!0&&r(a.read)&&r(a.on)?i=new g(b):(t.File&&a instanceof File||a instanceof Object)&&(i=new e(b)),i.stream(a)}function b(a,b){function c(){"object"==typeof b&&("string"==typeof b.delimiter&&1===b.delimiter.length&&z.BAD_DELIMITERS.indexOf(b.delimiter)===-1&&(j=b.delimiter),("boolean"==typeof b.quotes||b.quotes instanceof Array)&&(h=b.quotes),"string"==typeof b.newline&&(k=b.newline),"string"==typeof b.quoteChar&&(l=b.quoteChar),"boolean"==typeof b.header&&(i=b.header))}function d(a){if("object"!=typeof a)return[];var b=[];for(var c in a)b.push(c);return b}function e(a,b){var c="";"string"==typeof a&&(a=JSON.parse(a)),"string"==typeof b&&(b=JSON.parse(b));var d=a instanceof Array&&a.length>0,e=!(b[0]instanceof Array);if(d&&i){for(var g=0;g<a.length;g++)g>0&&(c+=j),c+=f(a[g],g);b.length>0&&(c+=k)}for(var h=0;h<b.length;h++){for(var l=d?a.length:b[h].length,m=0;m<l;m++){m>0&&(c+=j);var n=d&&e?a[m]:m;c+=f(b[h][n],m)}h<b.length-1&&(c+=k)}return c}function f(a,b){if("undefined"==typeof a||null===a)return"";a=a.toString().replace(m,l+l);var c="boolean"==typeof h&&h||h instanceof Array&&h[b]||g(a,z.BAD_DELIMITERS)||a.indexOf(j)>-1||" "===a.charAt(0)||" "===a.charAt(a.length-1);return c?l+a+l:a}function g(a,b){for(var c=0;c<b.length;c++)if(a.indexOf(b[c])>-1)return!0;return!1}var h=!1,i=!0,j=",",k="\r\n",l='"';c();var m=new RegExp(l,"g");if("string"==typeof a&&(a=JSON.parse(a)),a instanceof Array){if(!a.length||a[0]instanceof Array)return e(null,a);if("object"==typeof a[0])return e(d(a[0]),a)}else if("object"==typeof a)return"string"==typeof a.data&&(a.data=JSON.parse(a.data)),a.data instanceof Array&&(a.fields||(a.fields=a.meta&&a.meta.fields),a.fields||(a.fields=a.data[0]instanceof Array?a.fields:d(a.data[0])),a.data[0]instanceof Array||"object"==typeof a.data[0]||(a.data=[a.data])),e(a.fields||[],a.data||[]);throw"exception: Unable to serialize unrecognized input"}function c(a){function b(a){var b=p(a);b.chunkSize=parseInt(b.chunkSize),a.step||a.chunk||(b.chunkSize=null),this._handle=new h(b),this._handle.streamer=this,this._config=b}this._handle=null,this._paused=!1,this._finished=!1,this._input=null,this._baseIndex=0,this._partialLine="",this._rowCount=0,this._start=0,this._nextChunk=null,this.isFirstChunk=!0,this._completeResults={data:[],errors:[],meta:{}},b.call(this,a),this.parseChunk=function(a){if(this.isFirstChunk&&r(this._config.beforeFirstChunk)){var b=this._config.beforeFirstChunk(a);void 0!==b&&(a=b)}this.isFirstChunk=!1;var c=this._partialLine+a;this._partialLine="";var d=this._handle.parse(c,this._baseIndex,!this._finished);if(!this._handle.paused()&&!this._handle.aborted()){var e=d.meta.cursor;this._finished||(this._partialLine=c.substring(e-this._baseIndex),this._baseIndex=e),d&&d.data&&(this._rowCount+=d.data.length);var f=this._finished||this._config.preview&&this._rowCount>=this._config.preview;if(v)t.postMessage({results:d,workerId:z.WORKER_ID,finished:f});else if(r(this._config.chunk)){if(this._config.chunk(d,this._handle),this._paused)return;d=void 0,this._completeResults=void 0}return this._config.step||this._config.chunk||(this._completeResults.data=this._completeResults.data.concat(d.data),this._completeResults.errors=this._completeResults.errors.concat(d.errors),this._completeResults.meta=d.meta),!f||!r(this._config.complete)||d&&d.meta.aborted||this._config.complete(this._completeResults,this._input),f||d&&d.meta.paused||this._nextChunk(),d}},this._sendError=function(a){r(this._config.error)?this._config.error(a):v&&this._config.error&&t.postMessage({workerId:z.WORKER_ID,error:a,finished:!1})}}function d(a){function b(a){var b=a.getResponseHeader("Content-Range");return null===b?-1:parseInt(b.substr(b.lastIndexOf("/")+1))}a=a||{},a.chunkSize||(a.chunkSize=z.RemoteChunkSize),c.call(this,a);var d;u?this._nextChunk=function(){this._readChunk(),this._chunkLoaded()}:this._nextChunk=function(){this._readChunk()},this.stream=function(a){this._input=a,this._nextChunk()},this._readChunk=function(){if(this._finished)return void this._chunkLoaded();if(d=new XMLHttpRequest,this._config.withCredentials&&(d.withCredentials=this._config.withCredentials),u||(d.onload=q(this._chunkLoaded,this),d.onerror=q(this._chunkError,this)),d.open("GET",this._input,!u),this._config.downloadRequestHeaders){var a=this._config.downloadRequestHeaders;for(var b in a)d.setRequestHeader(b,a[b])}if(this._config.chunkSize){var c=this._start+this._config.chunkSize-1;d.setRequestHeader("Range","bytes="+this._start+"-"+c),d.setRequestHeader("If-None-Match","webkit-no-cache")}try{d.send()}catch(a){this._chunkError(a.message)}u&&0===d.status?this._chunkError():this._start+=this._config.chunkSize},this._chunkLoaded=function(){if(4==d.readyState){if(d.status<200||d.status>=400)return void this._chunkError();this._finished=!this._config.chunkSize||this._start>b(d),this.parseChunk(d.responseText)}},this._chunkError=function(a){var b=d.statusText||a;this._sendError(b)}}function e(a){a=a||{},a.chunkSize||(a.chunkSize=z.LocalChunkSize),c.call(this,a);var b,d,e="undefined"!=typeof FileReader;this.stream=function(a){this._input=a,d=a.slice||a.webkitSlice||a.mozSlice,e?(b=new FileReader,b.onload=q(this._chunkLoaded,this),b.onerror=q(this._chunkError,this)):b=new FileReaderSync,this._nextChunk()},this._nextChunk=function(){this._finished||this._config.preview&&!(this._rowCount<this._config.preview)||this._readChunk()},this._readChunk=function(){var a=this._input;if(this._config.chunkSize){var c=Math.min(this._start+this._config.chunkSize,this._input.size);a=d.call(a,this._start,c)}var f=b.readAsText(a,this._config.encoding);e||this._chunkLoaded({target:{result:f}})},this._chunkLoaded=function(a){this._start+=this._config.chunkSize,this._finished=!this._config.chunkSize||this._start>=this._input.size,this.parseChunk(a.target.result)},this._chunkError=function(){this._sendError(b.error.message)}}function f(a){a=a||{},c.call(this,a);var b,d;this.stream=function(a){return b=a,d=a,this._nextChunk()},this._nextChunk=function(){if(!this._finished){var a=this._config.chunkSize,b=a?d.substr(0,a):d;return d=a?d.substr(a):"",this._finished=!d,this.parseChunk(b)}}}function g(a){a=a||{},c.call(this,a);var b=[],d=!0;this.stream=function(a){this._input=a,this._input.on("data",this._streamData),this._input.on("end",this._streamEnd),this._input.on("error",this._streamError)},this._nextChunk=function(){b.length?this.parseChunk(b.shift()):d=!0},this._streamData=q(function(a){try{b.push("string"==typeof a?a:a.toString(this._config.encoding)),d&&(d=!1,this.parseChunk(b.shift()))}catch(a){this._streamError(a)}},this),this._streamError=q(function(a){this._streamCleanUp(),this._sendError(a.message)},this),this._streamEnd=q(function(){this._streamCleanUp(),this._finished=!0,this._streamData("")},this),this._streamCleanUp=q(function(){this._input.removeListener("data",this._streamData),this._input.removeListener("end",this._streamEnd),this._input.removeListener("error",this._streamError)},this)}function h(a){function b(){if(x&&o&&(l("Delimiter","UndetectableDelimiter","Unable to auto-detect delimiting character; defaulted to '"+z.DefaultDelimiter+"'"),o=!1),a.skipEmptyLines)for(var b=0;b<x.data.length;b++)1===x.data[b].length&&""===x.data[b][0]&&x.data.splice(b--,1);return c()&&d(),g()}function c(){return a.header&&0===w.length}function d(){if(x){for(var a=0;c()&&a<x.data.length;a++)for(var b=0;b<x.data[a].length;b++)w.push(x.data[a][b]);x.data.splice(0,1)}}function e(b){return a.dynamicTypingFunction&&void 0===a.dynamicTyping[b]&&(a.dynamicTyping[b]=a.dynamicTypingFunction(b)),(a.dynamicTyping[b]||a.dynamicTyping)===!0}function f(a,b){return e(a)?"true"===b||"TRUE"===b||"false"!==b&&"FALSE"!==b&&k(b):b}function g(){if(!x||!a.header&&!a.dynamicTyping)return x;for(var b=0;b<x.data.length;b++){for(var c=a.header?{}:[],d=0;d<x.data[b].length;d++){var e=d,g=x.data[b][d];a.header&&(e=d>=w.length?"__parsed_extra":w[d]),g=f(e,g),"__parsed_extra"===e?(c[e]=c[e]||[],c[e].push(g)):c[e]=g}x.data[b]=c,a.header&&(d>w.length?l("FieldMismatch","TooManyFields","Too many fields: expected "+w.length+" fields but parsed "+d,b):d<w.length&&l("FieldMismatch","TooFewFields","Too few fields: expected "+w.length+" fields but parsed "+d,b))}return a.header&&x.meta&&(x.meta.fields=w),x}function h(b,c,d){for(var e,f,g,h=[",","\t","|",";",z.RECORD_SEP,z.UNIT_SEP],j=0;j<h.length;j++){var k=h[j],l=0,m=0,n=0;g=void 0;for(var o=new i({delimiter:k,newline:c,preview:10}).parse(b),p=0;p<o.data.length;p++)if(d&&1===o.data[p].length&&0===o.data[p][0].length)n++;else{var q=o.data[p].length;m+=q,"undefined"!=typeof g?q>1&&(l+=Math.abs(q-g),g=q):g=q}o.data.length>0&&(m/=o.data.length-n),("undefined"==typeof f||l<f)&&m>1.99&&(f=l,e=k)}return a.delimiter=e,{successful:!!e,bestDelimiter:e}}function j(a){a=a.substr(0,1048576);var b=a.split("\r"),c=a.split("\n"),d=c.length>1&&c[0].length<b[0].length;if(1===b.length||d)return"\n";for(var e=0,f=0;f<b.length;f++)"\n"===b[f][0]&&e++;return e>=b.length/2?"\r\n":"\r"}function k(a){var b=q.test(a);return b?parseFloat(a):a}function l(a,b,c,d){x.errors.push({type:a,code:b,message:c,row:d})}var m,n,o,q=/^\s*-?(\d*\.?\d+|\d+\.?\d*)(e[-+]?\d+)?\s*$/i,s=this,t=0,u=!1,v=!1,w=[],x={data:[],errors:[],meta:{}};if(r(a.step)){var y=a.step;a.step=function(d){if(x=d,c())b();else{if(b(),0===x.data.length)return;t+=d.data.length,a.preview&&t>a.preview?n.abort():y(x,s)}}}this.parse=function(c,d,e){if(a.newline||(a.newline=j(c)),o=!1,a.delimiter)r(a.delimiter)&&(a.delimiter=a.delimiter(c),x.meta.delimiter=a.delimiter);else{var f=h(c,a.newline,a.skipEmptyLines);f.successful?a.delimiter=f.bestDelimiter:(o=!0,a.delimiter=z.DefaultDelimiter),x.meta.delimiter=a.delimiter}var g=p(a);return a.preview&&a.header&&g.preview++,m=c,n=new i(g),x=n.parse(m,d,e),b(),u?{meta:{paused:!0}}:x||{meta:{paused:!1}}},this.paused=function(){return u},this.pause=function(){u=!0,n.abort(),m=m.substr(n.getCharIndex())},this.resume=function(){u=!1,s.streamer.parseChunk(m)},this.aborted=function(){return v},this.abort=function(){v=!0,n.abort(),x.meta.aborted=!0,r(a.complete)&&a.complete(x),m=""}}function i(a){a=a||{};var b=a.delimiter,c=a.newline,d=a.comments,e=a.step,f=a.preview,g=a.fastMode;if(void 0===a.quoteChar)var h='"';else var h=a.quoteChar;if(("string"!=typeof b||z.BAD_DELIMITERS.indexOf(b)>-1)&&(b=","),d===b)throw"Comment character same as delimiter";d===!0?d="#":("string"!=typeof d||z.BAD_DELIMITERS.indexOf(d)>-1)&&(d=!1),"\n"!=c&&"\r"!=c&&"\r\n"!=c&&(c="\n");var i=0,j=!1;this.parse=function(a,k,l){function m(a){x.push(a),A=i}function n(b){return l?p():("undefined"==typeof b&&(b=a.substr(i)),z.push(b),i=s,m(z),w&&q(),p())}function o(b){i=b,m(z),z=[],E=a.indexOf(c,i)}function p(a){return{data:x,errors:y,meta:{delimiter:b,linebreak:c,aborted:j,truncated:!!a,cursor:A+(k||0)}}}function q(){e(p()),x=[],y=[]}if("string"!=typeof a)throw"Input must be a string";var s=a.length,t=b.length,u=c.length,v=d.length,w=r(e);i=0;var x=[],y=[],z=[],A=0;if(!a)return p();if(g||g!==!1&&a.indexOf(h)===-1){for(var B=a.split(c),C=0;C<B.length;C++){var z=B[C];if(i+=z.length,C!==B.length-1)i+=c.length;else if(l)return p();if(!d||z.substr(0,v)!==d){if(w){if(x=[],m(z.split(b)),q(),j)return p()}else m(z.split(b));if(f&&C>=f)return x=x.slice(0,f),p(!0)}}return p()}for(var D=a.indexOf(b,i),E=a.indexOf(c,i),F=new RegExp(h+h,"g");;)if(a[i]!==h)if(d&&0===z.length&&a.substr(i,v)===d){if(E===-1)return p();i=E+u,E=a.indexOf(c,i),D=a.indexOf(b,i)}else if(D!==-1&&(D<E||E===-1))z.push(a.substring(i,D)),i=D+t,D=a.indexOf(b,i);else{if(E===-1)break;if(z.push(a.substring(i,E)),o(E+u),w&&(q(),j))return p();if(f&&x.length>=f)return p(!0)}else{var G=i;for(i++;;){var G=a.indexOf(h,G+1);if(G===-1)return l||y.push({type:"Quotes",code:"MissingQuotes",message:"Quoted field unterminated",row:x.length,index:i}),n();if(G===s-1){var H=a.substring(i,G).replace(F,h);return n(H)}if(a[G+1]!==h){if(a[G+1]===b){z.push(a.substring(i,G).replace(F,h)),i=G+1+t,D=a.indexOf(b,i),E=a.indexOf(c,i);break}if(a.substr(G+1,u)===c){if(z.push(a.substring(i,G).replace(F,h)),o(G+1+u),D=a.indexOf(b,i),w&&(q(),j))return p();if(f&&x.length>=f)return p(!0);break}y.push({type:"Quotes",code:"InvalidQuotes",message:"Trailing quote on quoted field is malformed",row:x.length,index:i}),G++}else G++}}return n()},this.abort=function(){j=!0},this.getCharIndex=function(){return i}}function j(){var a=document.getElementsByTagName("script");return a.length?a[a.length-1].src:""}function k(){if(!z.WORKERS_SUPPORTED)return!1;if(!w&&null===z.SCRIPT_PATH)throw new Error("Script path cannot be determined automatically when Papa Parse is loaded asynchronously. You need to set Papa.SCRIPT_PATH manually.");var a=z.SCRIPT_PATH||s;a+=(a.indexOf("?")!==-1?"&":"?")+"papaworker";var b=new t.Worker(a);return b.onmessage=l,b.id=y++,x[b.id]=b,b}function l(a){var b=a.data,c=x[b.workerId],d=!1;if(b.error)c.userError(b.error,b.file);else if(b.results&&b.results.data){var e=function(){d=!0,m(b.workerId,{data:[],errors:[],meta:{aborted:!0}})},f={abort:e,pause:n,resume:n};if(r(c.userStep)){for(var g=0;g<b.results.data.length&&(c.userStep({data:[b.results.data[g]],errors:b.results.errors,meta:b.results.meta},f),!d);g++);delete b.results}else r(c.userChunk)&&(c.userChunk(b.results,f,b.file),delete b.results)}b.finished&&!d&&m(b.workerId,b.results)}function m(a,b){var c=x[a];r(c.userComplete)&&c.userComplete(b),c.terminate(),delete x[a]}function n(){throw"Not implemented."}function o(a){var b=a.data;if("undefined"==typeof z.WORKER_ID&&b&&(z.WORKER_ID=b.workerId),"string"==typeof b.input)t.postMessage({workerId:z.WORKER_ID,results:z.parse(b.input,b.config),finished:!0});else if(t.File&&b.input instanceof File||b.input instanceof Object){var c=z.parse(b.input,b.config);c&&t.postMessage({workerId:z.WORKER_ID,results:c,finished:!0})}}function p(a){if("object"!=typeof a)return a;var b=a instanceof Array?[]:{};for(var c in a)b[c]=p(a[c]);return b}function q(a,b){return function(){a.apply(b,arguments)}}function r(a){return"function"==typeof a}var s,t=function(){return"undefined"!=typeof self?self:"undefined"!=typeof window?window:"undefined"!=typeof t?t:{}}(),u=!t.document&&!!t.postMessage,v=u&&/(\?|&)papaworker(=|&|$)/.test(t.location.search),w=!1,x={},y=0,z={};if(z.parse=a,z.unparse=b,z.RECORD_SEP=String.fromCharCode(30),z.UNIT_SEP=String.fromCharCode(31),z.BYTE_ORDER_MARK="\ufeff",z.BAD_DELIMITERS=["\r","\n",'"',z.BYTE_ORDER_MARK],z.WORKERS_SUPPORTED=!u&&!!t.Worker,z.SCRIPT_PATH=null,z.LocalChunkSize=10485760,z.RemoteChunkSize=5242880,z.DefaultDelimiter=",",z.Parser=i,z.ParserHandle=h,z.NetworkStreamer=d,z.FileStreamer=e,z.StringStreamer=f,z.ReadableStreamStreamer=g,t.jQuery){var A=t.jQuery;A.fn.parse=function(a){function b(){if(0===f.length)return void(r(a.complete)&&a.complete());var b=f[0];if(r(a.before)){var e=a.before(b.file,b.inputElem);if("object"==typeof e){if("abort"===e.action)return void c("AbortError",b.file,b.inputElem,e.reason);if("skip"===e.action)return void d();"object"==typeof e.config&&(b.instanceConfig=A.extend(b.instanceConfig,e.config))}else if("skip"===e)return void d()}var g=b.instanceConfig.complete;b.instanceConfig.complete=function(a){r(g)&&g(a,b.file,b.inputElem),d()},z.parse(b.file,b.instanceConfig)}function c(b,c,d,e){r(a.error)&&a.error({name:b},c,d,e)}function d(){f.splice(0,1),b()}var e=a.config||{},f=[];return this.each(function(a){var b="INPUT"===A(this).prop("tagName").toUpperCase()&&"file"===A(this).attr("type").toLowerCase()&&t.FileReader;if(!b||!this.files||0===this.files.length)return!0;for(var c=0;c<this.files.length;c++)f.push({file:this.files[c],inputElem:this,instanceConfig:A.extend({},e)})}),b(),this}}return v?t.onmessage=o:z.WORKERS_SUPPORTED&&(s=j(),document.body?document.addEventListener("DOMContentLoaded",function(){w=!0},!0):w=!0),d.prototype=Object.create(c.prototype),d.prototype.constructor=d,e.prototype=Object.create(c.prototype),e.prototype.constructor=e,f.prototype=Object.create(f.prototype),f.prototype.constructor=f,g.prototype=Object.create(c.prototype),g.prototype.constructor=g,z});
/*!
 * circletype 2.2.1
 * A JavaScript library that lets you curve type on the web.
 * Copyright © 2014-2018 Peter Hrynkow
 * Licensed MIT
 * https://github.com/peterhry/CircleType#readme
 */
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.CircleType=e():t.CircleType=e()}("undefined"!=typeof self?self:this,function(){return function(t){function e(r){if(n[r])return n[r].exports;var i=n[r]={i:r,l:!1,exports:{}};return t[r].call(i.exports,i,i.exports,e),i.l=!0,i.exports}var n={};return e.m=t,e.c=n,e.d=function(t,n,r){e.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:r})},e.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(n,"a",n),n},e.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},e.p="",e(e.s=29)}([function(t,e,n){var r=n(24)("wks"),i=n(12),o=n(1).Symbol,u="function"==typeof o;(t.exports=function(t){return r[t]||(r[t]=u&&o[t]||(u?o:i)("Symbol."+t))}).store=r},function(t,e){var n=t.exports="undefined"!=typeof window&&window.Math==Math?window:"undefined"!=typeof self&&self.Math==Math?self:Function("return this")();"number"==typeof __g&&(__g=n)},function(t,e){var n=t.exports={version:"2.5.6"};"number"==typeof __e&&(__e=n)},function(t,e,n){var r=n(4),i=n(11);t.exports=n(6)?function(t,e,n){return r.f(t,e,i(1,n))}:function(t,e,n){return t[e]=n,t}},function(t,e,n){var r=n(5),i=n(34),o=n(35),u=Object.defineProperty;e.f=n(6)?Object.defineProperty:function(t,e,n){if(r(t),e=o(e,!0),r(n),i)try{return u(t,e,n)}catch(t){}if("get"in n||"set"in n)throw TypeError("Accessors not supported!");return"value"in n&&(t[e]=n.value),t}},function(t,e,n){var r=n(10);t.exports=function(t){if(!r(t))throw TypeError(t+" is not an object!");return t}},function(t,e,n){t.exports=!n(17)(function(){return 7!=Object.defineProperty({},"a",{get:function(){return 7}}).a})},function(t,e){var n={}.hasOwnProperty;t.exports=function(t,e){return n.call(t,e)}},function(t,e){var n=Math.ceil,r=Math.floor;t.exports=function(t){return isNaN(t=+t)?0:(t>0?r:n)(t)}},function(t,e){t.exports=function(t){if(void 0==t)throw TypeError("Can't call method on  "+t);return t}},function(t,e){t.exports=function(t){return"object"==typeof t?null!==t:"function"==typeof t}},function(t,e){t.exports=function(t,e){return{enumerable:!(1&t),configurable:!(2&t),writable:!(4&t),value:e}}},function(t,e){var n=0,r=Math.random();t.exports=function(t){return"Symbol(".concat(void 0===t?"":t,")_",(++n+r).toString(36))}},function(t,e){t.exports={}},function(t,e,n){var r=n(24)("keys"),i=n(12);t.exports=function(t){return r[t]||(r[t]=i(t))}},function(t,e){t.exports=!1},function(t,e,n){var r=n(1),i=n(2),o=n(3),u=n(19),c=n(20),f=function(t,e,n){var a,s,l,p,h=t&f.F,d=t&f.G,v=t&f.S,y=t&f.P,_=t&f.B,m=d?r:v?r[e]||(r[e]={}):(r[e]||{}).prototype,g=d?i:i[e]||(i[e]={}),x=g.prototype||(g.prototype={});d&&(n=e);for(a in n)s=!h&&m&&void 0!==m[a],l=(s?m:n)[a],p=_&&s?c(l,r):y&&"function"==typeof l?c(Function.call,l):l,m&&u(m,a,l,t&f.U),g[a]!=l&&o(g,a,p),y&&x[a]!=l&&(x[a]=l)};r.core=i,f.F=1,f.G=2,f.S=4,f.P=8,f.B=16,f.W=32,f.U=64,f.R=128,t.exports=f},function(t,e){t.exports=function(t){try{return!!t()}catch(t){return!0}}},function(t,e,n){var r=n(10),i=n(1).document,o=r(i)&&r(i.createElement);t.exports=function(t){return o?i.createElement(t):{}}},function(t,e,n){var r=n(1),i=n(3),o=n(7),u=n(12)("src"),c=Function.toString,f=(""+c).split("toString");n(2).inspectSource=function(t){return c.call(t)},(t.exports=function(t,e,n,c){var a="function"==typeof n;a&&(o(n,"name")||i(n,"name",e)),t[e]!==n&&(a&&(o(n,u)||i(n,u,t[e]?""+t[e]:f.join(String(e)))),t===r?t[e]=n:c?t[e]?t[e]=n:i(t,e,n):(delete t[e],i(t,e,n)))})(Function.prototype,"toString",function(){return"function"==typeof this&&this[u]||c.call(this)})},function(t,e,n){var r=n(36);t.exports=function(t,e,n){if(r(t),void 0===e)return t;switch(n){case 1:return function(n){return t.call(e,n)};case 2:return function(n,r){return t.call(e,n,r)};case 3:return function(n,r,i){return t.call(e,n,r,i)}}return function(){return t.apply(e,arguments)}}},function(t,e,n){var r=n(42),i=n(9);t.exports=function(t){return r(i(t))}},function(t,e){var n={}.toString;t.exports=function(t){return n.call(t).slice(8,-1)}},function(t,e,n){var r=n(8),i=Math.min;t.exports=function(t){return t>0?i(r(t),9007199254740991):0}},function(t,e,n){var r=n(2),i=n(1),o=i["__core-js_shared__"]||(i["__core-js_shared__"]={});(t.exports=function(t,e){return o[t]||(o[t]=void 0!==e?e:{})})("versions",[]).push({version:r.version,mode:n(15)?"pure":"global",copyright:"© 2018 Denis Pushkarev (zloirock.ru)"})},function(t,e){t.exports="constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(",")},function(t,e,n){var r=n(4).f,i=n(7),o=n(0)("toStringTag");t.exports=function(t,e,n){t&&!i(t=n?t:t.prototype,o)&&r(t,o,{configurable:!0,value:e})}},function(t,e,n){var r=n(9);t.exports=function(t){return Object(r(t))}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=Math.PI/180;e.default=function(t){return t*r}},function(t,e,n){"use strict";n(30);var r=n(54),i=function(t){return t&&t.__esModule?t:{default:t}}(r);t.exports=i.default},function(t,e,n){n(31),n(47),t.exports=n(2).Array.from},function(t,e,n){"use strict";var r=n(32)(!0);n(33)(String,"String",function(t){this._t=String(t),this._i=0},function(){var t,e=this._t,n=this._i;return n>=e.length?{value:void 0,done:!0}:(t=r(e,n),this._i+=t.length,{value:t,done:!1})})},function(t,e,n){var r=n(8),i=n(9);t.exports=function(t){return function(e,n){var o,u,c=String(i(e)),f=r(n),a=c.length;return f<0||f>=a?t?"":void 0:(o=c.charCodeAt(f),o<55296||o>56319||f+1===a||(u=c.charCodeAt(f+1))<56320||u>57343?t?c.charAt(f):o:t?c.slice(f,f+2):u-56320+(o-55296<<10)+65536)}}},function(t,e,n){"use strict";var r=n(15),i=n(16),o=n(19),u=n(3),c=n(13),f=n(37),a=n(26),s=n(46),l=n(0)("iterator"),p=!([].keys&&"next"in[].keys()),h=function(){return this};t.exports=function(t,e,n,d,v,y,_){f(n,e,d);var m,g,x,b=function(t){if(!p&&t in M)return M[t];switch(t){case"keys":case"values":return function(){return new n(this,t)}}return function(){return new n(this,t)}},O=e+" Iterator",w="values"==v,j=!1,M=t.prototype,S=M[l]||M["@@iterator"]||v&&M[v],P=S||b(v),A=v?w?b("entries"):P:void 0,T="Array"==e?M.entries||S:S;if(T&&(x=s(T.call(new t)))!==Object.prototype&&x.next&&(a(x,O,!0),r||"function"==typeof x[l]||u(x,l,h)),w&&S&&"values"!==S.name&&(j=!0,P=function(){return S.call(this)}),r&&!_||!p&&!j&&M[l]||u(M,l,P),c[e]=P,c[O]=h,v)if(m={values:w?P:b("values"),keys:y?P:b("keys"),entries:A},_)for(g in m)g in M||o(M,g,m[g]);else i(i.P+i.F*(p||j),e,m);return m}},function(t,e,n){t.exports=!n(6)&&!n(17)(function(){return 7!=Object.defineProperty(n(18)("div"),"a",{get:function(){return 7}}).a})},function(t,e,n){var r=n(10);t.exports=function(t,e){if(!r(t))return t;var n,i;if(e&&"function"==typeof(n=t.toString)&&!r(i=n.call(t)))return i;if("function"==typeof(n=t.valueOf)&&!r(i=n.call(t)))return i;if(!e&&"function"==typeof(n=t.toString)&&!r(i=n.call(t)))return i;throw TypeError("Can't convert object to primitive value")}},function(t,e){t.exports=function(t){if("function"!=typeof t)throw TypeError(t+" is not a function!");return t}},function(t,e,n){"use strict";var r=n(38),i=n(11),o=n(26),u={};n(3)(u,n(0)("iterator"),function(){return this}),t.exports=function(t,e,n){t.prototype=r(u,{next:i(1,n)}),o(t,e+" Iterator")}},function(t,e,n){var r=n(5),i=n(39),o=n(25),u=n(14)("IE_PROTO"),c=function(){},f=function(){var t,e=n(18)("iframe"),r=o.length;for(e.style.display="none",n(45).appendChild(e),e.src="javascript:",t=e.contentWindow.document,t.open(),t.write("<script>document.F=Object<\/script>"),t.close(),f=t.F;r--;)delete f.prototype[o[r]];return f()};t.exports=Object.create||function(t,e){var n;return null!==t?(c.prototype=r(t),n=new c,c.prototype=null,n[u]=t):n=f(),void 0===e?n:i(n,e)}},function(t,e,n){var r=n(4),i=n(5),o=n(40);t.exports=n(6)?Object.defineProperties:function(t,e){i(t);for(var n,u=o(e),c=u.length,f=0;c>f;)r.f(t,n=u[f++],e[n]);return t}},function(t,e,n){var r=n(41),i=n(25);t.exports=Object.keys||function(t){return r(t,i)}},function(t,e,n){var r=n(7),i=n(21),o=n(43)(!1),u=n(14)("IE_PROTO");t.exports=function(t,e){var n,c=i(t),f=0,a=[];for(n in c)n!=u&&r(c,n)&&a.push(n);for(;e.length>f;)r(c,n=e[f++])&&(~o(a,n)||a.push(n));return a}},function(t,e,n){var r=n(22);t.exports=Object("z").propertyIsEnumerable(0)?Object:function(t){return"String"==r(t)?t.split(""):Object(t)}},function(t,e,n){var r=n(21),i=n(23),o=n(44);t.exports=function(t){return function(e,n,u){var c,f=r(e),a=i(f.length),s=o(u,a);if(t&&n!=n){for(;a>s;)if((c=f[s++])!=c)return!0}else for(;a>s;s++)if((t||s in f)&&f[s]===n)return t||s||0;return!t&&-1}}},function(t,e,n){var r=n(8),i=Math.max,o=Math.min;t.exports=function(t,e){return t=r(t),t<0?i(t+e,0):o(t,e)}},function(t,e,n){var r=n(1).document;t.exports=r&&r.documentElement},function(t,e,n){var r=n(7),i=n(27),o=n(14)("IE_PROTO"),u=Object.prototype;t.exports=Object.getPrototypeOf||function(t){return t=i(t),r(t,o)?t[o]:"function"==typeof t.constructor&&t instanceof t.constructor?t.constructor.prototype:t instanceof Object?u:null}},function(t,e,n){"use strict";var r=n(20),i=n(16),o=n(27),u=n(48),c=n(49),f=n(23),a=n(50),s=n(51);i(i.S+i.F*!n(53)(function(t){Array.from(t)}),"Array",{from:function(t){var e,n,i,l,p=o(t),h="function"==typeof this?this:Array,d=arguments.length,v=d>1?arguments[1]:void 0,y=void 0!==v,_=0,m=s(p);if(y&&(v=r(v,d>2?arguments[2]:void 0,2)),void 0==m||h==Array&&c(m))for(e=f(p.length),n=new h(e);e>_;_++)a(n,_,y?v(p[_],_):p[_]);else for(l=m.call(p),n=new h;!(i=l.next()).done;_++)a(n,_,y?u(l,v,[i.value,_],!0):i.value);return n.length=_,n}})},function(t,e,n){var r=n(5);t.exports=function(t,e,n,i){try{return i?e(r(n)[0],n[1]):e(n)}catch(e){var o=t.return;throw void 0!==o&&r(o.call(t)),e}}},function(t,e,n){var r=n(13),i=n(0)("iterator"),o=Array.prototype;t.exports=function(t){return void 0!==t&&(r.Array===t||o[i]===t)}},function(t,e,n){"use strict";var r=n(4),i=n(11);t.exports=function(t,e,n){e in t?r.f(t,e,i(0,n)):t[e]=n}},function(t,e,n){var r=n(52),i=n(0)("iterator"),o=n(13);t.exports=n(2).getIteratorMethod=function(t){if(void 0!=t)return t[i]||t["@@iterator"]||o[r(t)]}},function(t,e,n){var r=n(22),i=n(0)("toStringTag"),o="Arguments"==r(function(){return arguments}()),u=function(t,e){try{return t[e]}catch(t){}};t.exports=function(t){var e,n,c;return void 0===t?"Undefined":null===t?"Null":"string"==typeof(n=u(e=Object(t),i))?n:o?r(e):"Object"==(c=r(e))&&"function"==typeof e.callee?"Arguments":c}},function(t,e,n){var r=n(0)("iterator"),i=!1;try{var o=[7][r]();o.return=function(){i=!0},Array.from(o,function(){throw 2})}catch(t){}t.exports=function(t,e){if(!e&&!i)return!1;var n=!1;try{var o=[7],u=o[r]();u.next=function(){return{done:n=!0}},o[r]=function(){return u},t(o)}catch(t){}return n}},function(t,e,n){"use strict";function r(t){return t&&t.__esModule?t:{default:t}}function i(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(e,"__esModule",{value:!0});var o=function(){function t(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}return function(e,n,r){return n&&t(e.prototype,n),r&&t(e,r),e}}(),u=n(55),c=r(u),f=n(56),a=r(f),s=n(57),l=r(s),p=n(58),h=r(p),d=n(59),v=r(d),y=Math.PI,_=Math.max,m=Math.min,g=function(){function t(e){i(this,t),this.element=e,this.originalHTML=this.element.innerHTML;var n=document.createElement("div");n.setAttribute("aria-label",e.innerText),n.style.position="relative",this.container=n,this._letters=(0,a.default)(e),this._letters.forEach(function(t){return n.appendChild(t)}),this.element.innerHTML="",this.element.appendChild(n);var r=window.getComputedStyle(this.element),o=r.fontSize,u=r.lineHeight;this._fontSize=parseFloat(o),this._lineHeight=parseFloat(u)||this._fontSize,this._metrics=this._letters.map(c.default);var f=this._metrics.reduce(function(t,e){return t+e.width},0);this._minRadius=f/y/2+this._lineHeight,this._dir=1,this._forceWidth=!1,this._forceHeight=!0,this._radius=this._minRadius,this._invalidate()}return o(t,[{key:"radius",value:function(t){return void 0!==t?(this._radius=_(this._minRadius,t),this._invalidate(),this):this._radius}},{key:"dir",value:function(t){return void 0!==t?(this._dir=t,this._invalidate(),this):this._dir}},{key:"forceWidth",value:function(t){return void 0!==t?(this._forceWidth=t,this._invalidate(),this):this._forceWidth}},{key:"forceHeight",value:function(t){return void 0!==t?(this._forceHeight=t,this._invalidate(),this):this._forceHeight}},{key:"refresh",value:function(){return this._invalidate()}},{key:"destroy",value:function(){return this.element.innerHTML=this.originalHTML,this}},{key:"_invalidate",value:function(){var t=this;return cancelAnimationFrame(this._raf),this._raf=requestAnimationFrame(function(){t._layout()}),this}},{key:"_layout",value:function(){var t=this,e=this._radius,n=this._dir,r=-1===n?-e+this._lineHeight:e,i="center "+r/this._fontSize+"em",o=e-this._lineHeight,u=(0,v.default)(this._metrics,o),c=u.rotations,f=u.θ;if(this._letters.forEach(function(e,r){var o=e.style,u=(-.5*f+c[r])*n,a=-.5*t._metrics[r].width/t._fontSize,s="translateX("+a+"em) rotate("+u+"deg)";o.position="absolute",o.bottom=-1===n?0:"auto",o.left="50%",o.transform=s,o.transformOrigin=i,o.webkitTransform=s,o.webkitTransformOrigin=i}),this._forceHeight){var a=f>180?(0,l.default)(e,f):(0,l.default)(o,f)+this._lineHeight;this.container.style.height=a/this._fontSize+"em"}if(this._forceWidth){var s=(0,h.default)(e,m(180,f));this.container.style.width=s/this._fontSize+"em"}return this}}]),t}();e.default=g},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(t){var e=t.getBoundingClientRect();return{height:e.height,left:e.left+window.pageXOffset,top:e.top+window.pageYOffset,width:e.width}}},function(t,e,n){"use strict";function r(t){if(Array.isArray(t)){for(var e=0,n=Array(t.length);e<t.length;e++)n[e]=t[e];return n}return Array.from(t)}Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"span",n=document.createElement(e);return[].concat(r(t.innerText.trim())).map(function(t){var e=n.cloneNode();return e.insertAdjacentHTML("afterbegin"," "===t?"&nbsp;":t),e})}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=n(28),i=function(t){return t&&t.__esModule?t:{default:t}}(r);e.default=function(t,e){return t*(1-Math.cos((0,i.default)(e/2)))}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=n(28),i=function(t){return t&&t.__esModule?t:{default:t}}(r);e.default=function(t,e){return 2*t*Math.sin((0,i.default)(e/2))}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=n(60),i=function(t){return t&&t.__esModule?t:{default:t}}(r);e.default=function(t,e){return t.reduce(function(t,n){var r=n.width,o=(0,i.default)(r/e);return{"θ":t.θ+o,rotations:t.rotations.concat([t.θ+o/2])}},{"θ":0,rotations:[]})}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var r=180/Math.PI;e.default=function(t){return t*r}}])});
/*!
Copyright 2014 Adobe Systems Inc.;
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
!function(a){"use strict";function b(a){var b=getComputedStyle(a);this.units={px:1},this.element=a;var c=function(a){return a&&a.length?parseInt(a):0};this.margins=[b.marginTop,b.marginRight,b.marginBottom,b.marginLeft],this.margins=this.margins.map(c),this.borders=[b.borderTopWidth,b.borderRightWidth,b.borderBottomWidth,b.borderLeftWidth],this.borders=this.borders.map(c),this.paddings=[b.paddingTop,b.paddingRight,b.paddingBottom,b.paddingLeft],this.paddings=this.paddings.map(c),this.borderBox={x:0,y:0,width:a.offsetWidth,height:a.offsetHeight},this.marginBox={x:-this.margins[3],y:-this.margins[0],width:a.offsetWidth+this.margins[1]+this.margins[3],height:a.offsetHeight+this.margins[0]+this.margins[2]};var d=this,e=["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"];this.borderBox.radii=e.map(function(a){return a=b[a].split(/\s+/),[d.toPixels(a[0],d.borderBox.width),d.toPixels(a.length>1?a[1]:a[0],d.borderBox.height)]}),this.cssFloat=b.cssFloat}function c(a,b,c){return(c.x-a.x)*(b.y-a.y)-(b.x-a.x)*(c.y-a.y)}function d(a,b,d){return Math.abs(c(a,b,d))<350}function e(a,b){return a.x==b.x&&a.y==b.y}function f(a,b,c){return c.x>=Math.min(a.x,b.x)&&c.x<=Math.max(a.x,b.x)&&d(a,b,c)}function g(){}function h(a,b,c,d){if(a.y>=c&&a.y<=d)return{x1:a.x-b,x2:a.x+b};var e,f;return d<a.y?(e=d-a.y,f=z(e,b,b),{x1:a.x-f,x2:a.x+f}):(e=c-a.y,f=z(e,b,b),{x1:a.x-f,x2:a.x+f})}function i(a,b,c){this.init(a,b,c)}function j(a,b){var c=a.polygon.shapeMargin,d=b.x*c,e=b.y*c;this.anchorEdge=a,this.normalUnitVector=b;var f={x:a.vertex1.x+d,y:a.vertex1.y+e},g={x:a.vertex2.x+d,y:a.vertex2.y+e};this.init(a.polygon,f,g)}function k(a){for(var b=0,d=1;d<a.length;++d){var e=a[d];(e.y<a[b].y||e.y==a[b].y&&e.x<a[b].x)&&(b=d)}var f=a[(b+1)%a.length],g=a[(b+a.length-1)%a.length];return c(g,a[b],f)<0}function l(a,b,c){if(this.m_vertices=a,this.fillRule=b,this.shapeMargin=c,a.length<3)return this.m_edges=[],void(this.shapeMarginEdges=[]);var e=[],f=a.length>0?a[0].x:void 0,g=a.length>0?a[0].y:void 0,h=f,l=g,m=k(a),n=0;do{var o=this.nextEdgeVertexIndex(n,m);e.push(new i(this,a[n],a[o]));var p=a[n].x,q=a[n].y;f=Math.min(p,f),g=Math.min(q,g),h=Math.max(p,h),l=Math.max(q,l),n=o}while(0!==n);for(var r,s=0;s<e.length&&e.length>3;)r=(s+1)%e.length,d(e[s].vertex1,e[s].vertex2,e[r].vertex2)?(e[s].vertex2=e[r].vertex2,e.splice(r,1)):s++;if(0===c)this.shapeMarginEdges=e;else{for(var t=[],u=0;u<e.length;u++)t.push(new j(e[u],e[u].outwardNormal())),t.push(new j(e[u],e[u].inwardNormal()));this.shapeMarginEdges=t}this.m_edges=e,this.bounds=new x(f-c,g-c,2*c+(h-f),2*c+(l-g))}function m(a,b){return a.minX-b.minX}function n(a,b){return b.x-a.x}function o(a,b){return b.maxX-a.maxX}function p(a,b){return a.x-b.x}function q(a,b,c){this.y=a,this.startX=b,this.endX=c}function r(a,b){this.intervals=[],this.yOffset=a,this.size=b;for(var c=0;b>c;c++)this.intervals[c]=r.none;this.minY=-a,this.maxY=b-a}function s(a){this.shapeMargin=a,this.xIntercepts=[];for(var b=0;a>=b;b++)this.xIntercepts[b]=Math.sqrt(a*a-b*b)}function t(a,b){console.log("Unable to load image ",a,". It's probably missing or you've run into a CORS issue."),b&&console.log("The exact problem was ",b)}function u(a,b,c){var d=document.createElement("canvas");this.width=d.width=b,this.height=d.height=c;var e=d.getContext("2d");e.drawImage(a,0,0,b,c);try{this.imageData=e.getImageData(0,0,b,c)}catch(f){t(a.src,f)}}function v(a,b,c,d,e,f){this.url=a,this.box=b,this.shapeImageThreshold=256*c,this.shapeMargin=d,this.clip=e,this.init(f)}function w(a,b){this.width=a,this.height=b}function x(a,b,c,d){this.x=a,this.y=b,this.width=c,this.height=d,this.maxX=a+c,this.maxY=b+d}function y(a,b,c,d,e){this.rect=a,this.radii={topLeft:b,topRight:c,bottomLeft:d,bottomRight:e}}function z(a,b,c){return b*Math.sqrt(1-a*a/(c*c))}function A(a,b,c){return 0===b?1:Math.round(0===a||c>a*b/2?b:Math.sqrt(2*c*(b/a)))}function B(a,b){return a.maxX-b}function C(a,b){return a.x+b}function D(a){return a.x}function E(a){return a.maxX}function F(a,b,c,d){return function(e,f,g){if(!this.rect.overlapsYRange(e,f))return[{x:void 0,height:f-e}];var h=[];e<this.rect.y&&h.push({x:void 0,height:this.rect.y-e});var i,j,k,l,m,n,o=a.call(this),p=b.call(this),q=new x(this.rect.x,o.maxY,this.rect.width,p.y-o.maxY);if(o.overlapsYRange(e,f))for(i=A(o.width,o.height,g),j=Math.max(o.y,e),k=Math.min(o.maxY,f),l=j;k>l;l+=i)m=o.maxY-Math.min(l+i,k),n=z(m,o.width,o.height),h.push({height:Math.min(i,k-l),x:d(o,n)});if(j=Math.max(q.y,e),k=Math.min(q.maxY,f),q.overlapsYRange(e,f)&&h.push({x:c(q),height:k-j}),p.overlapsYRange(e,f))for(i=A(p.width,p.height,g),j=Math.max(e,p.y),k=Math.min(p.maxY,f),l=j;k>l;l+=i)m=l-p.y,n=z(m,p.width,p.height),h.push({height:Math.min(i,k-l),x:d(p,n)});return f>this.rect.maxY&&h.push({x:void 0,height:f-this.rect.maxY}),h}}function G(a,b){var c=a.r+b,d=new w(c,c);return new y(new x(a.cx-c,a.cy-c,2*c,2*c),d,d,d,d)}function H(a,b){var c=new w(a.rx+b,a.ry+b);return new y(new x(a.cx-c.width,a.cy-c.height,2*c.width,2*c.height),c,c,c,c)}function I(a,b){function c(a){return new w(a[0]+b,a[1]+b)}var d=c(a.radii[0]),e=c(a.radii[1]),f=c(a.radii[2]),g=c(a.radii[3]),h=new x(a.x-b,a.y-b,a.width+2*b,a.height+2*b);return new y(h,d,e,g,f)}function J(a,b){function c(a){return new w(a[0]+b,a[1]+b)}var d=c(a.radii[0]),e=c(a.radii[1]),f=c(a.radii[2]),g=c(a.radii[3]),h=new x(-b,-b,a.width+2*b,a.height+2*b);return new y(h,d,e,g,f)}function K(a,b,c,d,e,f){var g=new x(e.x,e.y,e.width,e.height);return new v(a,b,c,d,g,f)}function L(a,b){return new l(a.points,a.fillRule,b)}function M(a,b){var c,d=void 0===a.shapeMargin?0:a.shapeMargin;if(a.shape){switch(a.shape.type){case"circle":c=G(a.shape,d);break;case"ellipse":c=H(a.shape,d);break;case"inset":c=I(a.shape,d),c.isRenderable()||c.adjustRadii();break;case"polygon":c=L(a.shape,d)}return b(),c}return a.url?K(a.url,a.box,a.shapeImageThreshold,d,a.clip,b):a.box?(c=J(a.box,d),b(),c):void console.error("Unrecognized shape")}function N(a){this.metrics=new b(a);var c={metrics:this.metrics,shapeOutside:a.getAttribute("data-shape-outside"),shapeMargin:a.getAttribute("data-shape-margin"),shapeImageThreshold:a.getAttribute("data-shape-image-threshold")};this.shapeValue=new R(c);var d=this;this.geometry=M(this.shapeValue,function(){d.ready=!0,d.callback&&d.callback()})}function O(a){this.scope=a;var b=document.currentScript;b||(b=document.getElementsByTagName("script"),b=b[b.length-1]);var c=this,d="false"!==b.getAttribute("data-auto-run");d&&a.addEventListener&&a.addEventListener("load",function(){c.run()})}function P(a,b){var c,d=document.createElement("div");b.forEach(function(a){var b=a.bottom-a.top,e=document.createElement("div");e.className="sandbag",c={cssFloat:a.cssFloat,width:a.offset+"px",height:b+"px",clear:a.cssFloat};for(var f in c)e.style[f]=c[f];d.appendChild(e)}),c={position:"relative",width:"auto",height:"0",clear:"both",pointerEvents:"none"};for(var e in c)d.style[e]=c[e];var f,g=a.parentNode,h=getComputedStyle(g),i=parseFloat(h.borderTop)+parseFloat(h.borderBottom);c={position:"absolute",top:"0",width:"100%",height:g.clientHeight-i,left:"0"},f=document.createElement("div");for(e in c)f.style[e]=c[e];d.appendChild(f),a.parentNode&&a.parentNode.insertBefore(d,a),f.appendChild(a),d.setAttribute("data-shape-outside-container","true")}function Q(a,b){var c;return function(){var d=this,e=arguments;clearTimeout(c),c=setTimeout(function(){c=null,a.apply(d,e)},b)}}function R(a){return a&&a.metrics&&a.shapeOutside?(this.url=this.parseUrl(a.shapeOutside),this.box=this.parseBox(this.url?"content-box":a.shapeOutside,a.metrics),this.shape=this.parseBasicShape(a.shapeOutside,this.box,a.metrics),this.clip=this.computeClip(this.box,a.metrics),this.shapeMargin=this.parseShapeMargin(a.shapeMargin,this.box,a.metrics),void(this.shapeImageThreshold=this.parseShapeImageThreshold(a.shapeImageThreshold))):void console.error("ShapeValue requires at least a metrics object and shape-outside string")}function S(a,b,c){var d=c.reduce(function(a,b){return a+b[0]},0),e=c.reduce(function(a,b){return a+b[1]},0),f=c.reduce(function(a,b){return a+b[2]},0),g=c.reduce(function(a,b){return a+b[3]},0);a.x-=b*g,a.y-=b*d,a.width+=b*(g+e),a.height+=b*(d+f)}function T(a,b,c){if(0>b)return Math.max(a+b*c,0);var d=Math.abs(a/c);return 1>d?Math.max(a+c*(1+Math.pow(d-1,3)),0):a+c}function U(a,b,c){var d=c.reduce(function(a,b){return a+b[0]},0),e=c.reduce(function(a,b){return a+b[1]},0),f=c.reduce(function(a,b){return a+b[2]},0),g=c.reduce(function(a,b){return a+b[3]},0);a[0][0]=T(a[0][0],b,g),a[0][1]=T(a[0][1],b,d),a[1][0]=T(a[1][0],b,e),a[1][1]=T(a[1][1],b,d),a[2][0]=T(a[2][0],b,e),a[2][1]=T(a[2][1],b,f),a[3][0]=T(a[3][0],b,g),a[3][1]=T(a[3][1],b,f)}function V(a,b){return a.map(function(a){return a[b]})}function W(a,b,c){a=a.split(/\s+/);var d="TopLeft",e=0;switch(a[0]){case"top":case"left":break;case"bottom":case"right":d="BottomRight";break;case"center":e=b/2;break;default:e=c.toPixels(a[0],b)}return a.length>1&&(e=c.toPixels(a[1],b)),"TopLeft"===d?e:b-e}function X(a,b,c,d){return"closest-side"===a?Math.min.apply(null,b):"farthest-side"===a?Math.max.apply(null,b):d.toPixels(a,c)}function Y(){var a,b,c=document,d=[];if("function"==typeof c.querySelectorAll)d=c.querySelectorAll('link[rel="stylesheet"], style'),d=Array.prototype.slice.call(d,0);else{var e=c.getElementsByTagName("link");if(e.length)for(a=0,b=e.length;b>a;a++)"stylesheet"===e[a].getAttribute("rel")&&d.push(e[a]);for(e=c.getElementsByTagName("style"),a=0,b=e.length;b>a;a++)d.push(e[a])}return d}function Z(a){this.source=a,this.url=a.href||null,this.cssText=""}function $(a){return this instanceof $?(this.stylesheets=[],this.queueCount=0,this.callback=a||function(){},void this.init()):new $(a)}function _(a){this.callback=a||function(){};var b=this;new $(function(a){b.onStylesLoaded(a)})}b.prototype.unitToPx=function(a){if(this.units[a])return this.units[a];var b=this.element.style.getPropertyValue("line-height");return this.element.style.setProperty("line-height",1+a),this.units[a]=parseFloat(getComputedStyle(this.element).getPropertyValue("line-height")),this.element.style.setProperty("line-height",b),this.units[a]},b.prototype.getUnitsMap=function(a){var b=["em","ex","ch","rem","vw","vh","vmin","vmax","cm","mm","in","px","pt","pc"],c=document.createElement("div");c.style.width="0px",c.style.height="0px",a.appendChild(c);var d=getComputedStyle(c),e={};return b.forEach(function(a){c.style.lineHeight="1"+a,e[a]=parseFloat(d.lineHeight)}),c.parentNode.removeChild(c),e},b.prototype.toPixels=function(a,b){var c=/([\-0-9\.]*)([a-z%]*)/.exec(a);return c[1]=parseFloat(c[1]),c[2]?"%"===c[2]?c[1]*b/100:c[1]*this.unitToPx(c[2]):c[1]},g.prototype.init=function(a,b,c){this.polygon=a,this.vertex1=b,this.vertex2=c,this.minX=Math.min(this.vertex1.x,this.vertex2.x),this.maxX=Math.max(this.vertex1.x,this.vertex2.x)},g.prototype.containsPoint=function(a){return f(this.vertex1,this.vertex2,a)},g.prototype.overlapsYRange=function(a,b){var c=this.vertex1.y,d=this.vertex2.y;return b>=Math.min(c,d)&&a<=Math.max(c,d)},g.prototype.isWithinYRange=function(a,b){var c=this.vertex1.y,d=this.vertex2.y;return a<=Math.min(c,d)&&b>=Math.max(c,d)},g.prototype.inwardNormal=function(){var a=this.vertex2.x-this.vertex1.x,b=this.vertex2.y-this.vertex1.y,c=Math.sqrt(a*a+b*b);return{x:-b/c,y:a/c}},g.prototype.outwardNormal=function(){var a=this.inwardNormal();return{x:-a.x,y:-a.y}},g.prototype.xIntercept=function(a){var b=this.vertex1.y,c=this.vertex2.y;return b==c?Math.min(this.vertex1.x,this.vertex2.x):a==Math.min(b,c)?c>b?this.vertex1.x:this.vertex2.x:a==Math.max(b,c)?b>c?this.vertex1.x:this.vertex2.x:this.vertex1.x+(a-b)*(this.vertex2.x-this.vertex1.x)/(c-b)},g.prototype.clippedEdgeXRange=function(a,b){if(this.isWithinYRange(a,b)){var c=this.vertex1.x,d=this.vertex2.x;return{x1:Math.min(c,d),x2:Math.max(c,d)}}var e,f;this.vertex1.y<this.vertex2.y?(e=this.vertex1,f=this.vertex2):(e=this.vertex2,f=this.vertex1);var g=e.y<a?this.xIntercept(a):e.x,h=f.y>b?this.xIntercept(b):f.x;return{x1:Math.min(g,h),x2:Math.max(g,h)}},i.prototype=new g,j.prototype=new g,l.prototype.vertexAt=function(a){return this.m_vertices[a]},l.prototype.edgeAt=function(a){return this.m_edges[a]},l.prototype.isEmpty=function(){return this.m_edges.length<3||this.bounds.isEmpty()},l.prototype.vertices=function(){return this.m_vertices.slice(0)},l.prototype.edges=function(){return this.m_edges.slice(0)},l.prototype.overlapsYRange=function(a,b){return a<this.bounds.maxY&&b>=this.bounds.y},l.prototype.nextVertexIndex=function(a,b){var c=this.m_vertices.length;return(b?a+1:a-1+c)%c},l.prototype.nextEdgeVertexIndex=function(a,b){for(var c=(this.m_vertices.length,this.nextVertexIndex(a,b));c&&e(this.vertexAt(a),this.vertexAt(c));)c=this.nextVertexIndex(c,b);for(;c;){var f=this.nextVertexIndex(c,b);if(!d(this.vertexAt(a),this.vertexAt(c),this.vertexAt(f)))break;c=f}return c},l.prototype.containsPointEvenOdd=function(a){for(var b=0,c=0;c<this.m_edges.length;++c){var d=this.edgeAt(c);if(d.containsPoint(a))return!0;var e=d.vertex1,f=d.vertex2;if(e.y<=a.y&&f.y>a.y||e.y>a.y&&f.y<=a.y){var g=(a.y-e.y)/(f.y-e.y);a.x<e.x+g*(f.x-e.x)&&++b}}return 0!==(1&b)},l.prototype.containsPointNonZero=function(a){for(var b=0,d=0;d<this.m_edges.length;++d){var e=this.edgeAt(d);if(e.containsPoint(a))return!0;var f=e.vertex1,g=e.vertex2;g.y<a.y?f.y>a.y&&c(f,g,a)>0&&++b:g.y>a.y&&f.y<=a.y&&c(f,g,a)<0&&--b}return 0!==b},l.prototype.containsPoint=function(a){return this.bounds.containsPoint(a)?"nonzero"==this.fillRule?this.containsPointNonZero(a):this.containsPointEvenOdd(a):!1},l.prototype.edgeVerticesThatOverlapYRange=function(a,b){for(var c=[],d=0;d<this.m_edges.length;d++){var e=this.edgeAt(d).vertex1;e.y>=a&&e.y<b&&c.push(e)}return c},l.prototype.edgesThatOverlapYRange=function(a,b){for(var c=[],d=0;d<this.m_edges.length;d++){var e=this.edgeAt(d);e.overlapsYRange(a,b)&&c.push(e)}return c},l.prototype.shapeMarginEdgesThatOverlapYRange=function(a,b){for(var c=[],d=0;d<this.shapeMarginEdges.length;d++){var e=this.shapeMarginEdges[d];e.overlapsYRange(a,b)&&c.push(e)}return c},l.prototype.leftExclusionEdge=function(a,b){if(this.isEmpty()||!this.bounds.overlapsYRange(a,b))return void 0;var c,d,e,f=this.shapeMarginEdgesThatOverlapYRange(a,b);if(0!==f.length)for(f.sort(m),c=f[0].clippedEdgeXRange(a,b).x1,d=1;d<f.length&&!(f[d].minX>c);d++)e=f[d].clippedEdgeXRange(a,b),c=void 0===c?e.x1:Math.min(c,e.x1);var g=this.shapeMargin;if(g>0){var i=this.edgeVerticesThatOverlapYRange(a-g,b+g);for(i.sort(n),d=0;d<i.length;d++)e=h(i[d],g,a,b),c=void 0===c?e.x1:Math.min(c,e.x1)}return void 0===c&&console.error("Polygon leftExclusionEdge() failed"),c},l.prototype.rightExclusionEdge=function(a,b){if(this.isEmpty()||!this.bounds.overlapsYRange(a,b))return void 0;var c,d,e,f=this.shapeMarginEdgesThatOverlapYRange(a,b);if(0!==f.length)for(f.sort(o),c=f[0].clippedEdgeXRange(a,b).x2,d=1;d<f.length&&!(f[d].maxX<c);d++)e=f[d].clippedEdgeXRange(a,b),c=Math.max(c,e.x2);var g=this.shapeMargin;if(g>0){var i=this.edgeVerticesThatOverlapYRange(a-g,b+g);for(i.sort(p),d=0;d<i.length;d++)e=h(i[d],g,a,b),c=void 0===c?e.x2:Math.max(c,e.x2)}return void 0===c&&console.error("Polygon rightExclusionEdge() failed"),c},r.none={},r.prototype.intervalAt=function(a){return this.intervals[a+this.yOffset]},r.prototype.setIntervalAt=function(a,b){this.intervals[a+this.yOffset]=b},r.prototype.uniteIntervalAt=function(a,b){var c=this.intervalAt(a);c===r.none?this.setIntervalAt(a,b):(c.startX=Math.min(c.startX,b.startX),c.endX=Math.max(c.endX,b.endX))},r.prototype.intervalAtContains=function(a,b){var c=this.intervalAt(a);return c==r.none?!1:c.startX<=b.startX&&c.endX>=b.endX},s.prototype.generateIntervalAt=function(a,b){var c=Math.abs(a-b.y),d=c>this.shapeMargin?0:this.xIntercepts[c];return new q(a,b.startX-d,b.endX+d)},r.prototype.computeMarginIntervals=function(a){for(var b=new s(a),c=new r(this.yOffset,this.size),d=this.minY;d<this.maxY;++d){var e=this.intervalAt(d);if(e!=r.none){var f,g=Math.max(this.minY,d-a),h=Math.min(this.maxY-1,d+a);for(f=d-1;f>=g&&!(f>0&&this.intervalAtContains(f,e));--f)c.uniteIntervalAt(f,b.generateIntervalAt(f,e));for(c.uniteIntervalAt(d,b.generateIntervalAt(d,e)),f=d+1;h>=f&&!(f<this.maxY&&this.intervalAtContains(f,e));++f)c.uniteIntervalAt(f,b.generateIntervalAt(f,e))}}return c},u.prototype.hasData=function(){return!!this.imageData},u.prototype.alphaAt=function(a,b){return this.imageData.data[4*a+3+b*this.width*4]},v.prototype.init=function(a){var b,c=this,d=new Image,e=document.createElement("canvas");if(e.getContext||(t(c.url),a()),d.onload=function(){c.intervals=c.computeIntervals(d),c.intervals&&c.shapeMargin>0&&(c.intervals=c.intervals.computeMarginIntervals(c.shapeMargin,c.clip)),b&&URL.revokeObjectURL(b),a()},d.onerror=function(){t(c.url),a()},!d.hasOwnProperty("crossOrigin")&&window.URL&&window.URL.createObjectURL){var f=new XMLHttpRequest;f.onreadystatechange=function(){4===f.readyState&&(200===f.status?(b=URL.createObjectURL(f.response),d.src=b):(t(c.url),a()))},f.open("GET",c.url,!0),f.responseType="blob",f.send()}else d.crossOrigin="anonymous",d.src=c.url},v.prototype.computeIntervals=function(a){var b=this.clip,c=this.shapeImageThreshold,d=this.box.width,e=this.box.height,f=new u(a,d,e);if(!f.hasData())return void 0;for(var g=new r(-b.y,b.height),h=Math.min(b.height,this.box.height),i=0;h>i;i++)for(var j=-1,k=0;k<this.box.width;k++){var l=f.alphaAt(k,i);-1==j&&l>c?(j=k,g.intervalAt(i)===r.none&&g.setIntervalAt(i,new q(i,j,d))):-1!=j&&c>=l&&(g.intervalAt(i).endX=k,j=-1)}return g},v.prototype.rightExclusionEdge=function(a,b){var c=this.intervals;if(!c)return this.clip.width;for(var d,e=Math.max(a,this.clip.y);b>=e&&e<this.clip.maxY;e++){var f=c.intervalAt(e).endX;(void 0===d||void 0!==f&&f>d)&&(d=f)}return d},v.prototype.leftExclusionEdge=function(a,b){var c=this.intervals;if(!c)return 0;for(var d,e=Math.max(a,this.clip.y);b>=e&&e<this.clip.maxY;e++){var f=c.intervalAt(e).startX;(void 0===d||void 0!==f&&d>f)&&(d=f)}return d},w.zeroSize={width:0,height:0},w.prototype.isEmpty=function(){return this.width<=0||this.height<=0},w.prototype.scale=function(a){this.width*=a,this.height*=a},x.prototype.isEmpty=function(){return this.width<=0||this.height<=0},x.prototype.containsX=function(a){return a>=this.x&&a<this.maxX},x.prototype.containsY=function(a){return a>=this.y&&a<this.maxY},x.prototype.containsPoint=function(a){return this.containsX(a.x)&&this.containsY(a.y)},x.prototype.shiftLeftEdgeTo=function(a){this.width-=a-this.x,this.x=a},x.prototype.shiftTopEdgeTo=function(a){this.height-=a-this.y,this.y=a},x.prototype.shiftRightEdgeTo=function(a){this.width=a-this.x},x.prototype.shiftBottomEdgeTo=function(a){this.height=a-this.y},x.prototype.overlapsYRange=function(a,b){return!this.isEmpty()&&b>=this.y&&a<this.maxY},x.prototype.overlapsXRange=function(a,b){return!this.isEmpty()&&b>=this.x&&a<this.maxX},y.prototype.isEmpty=function(){return this.width<=0||this.height<=0},y.prototype.topLeftCorner=function(){return new x(this.rect.x,this.rect.y,this.radii.topLeft.width,this.radii.topLeft.height)},y.prototype.topRightCorner=function(){return new x(this.rect.maxX-this.radii.topRight.width,this.rect.y,this.radii.topRight.width,this.radii.topRight.height)},y.prototype.bottomLeftCorner=function(){return new x(this.rect.x,this.rect.maxY-this.radii.bottomLeft.height,this.radii.bottomLeft.width,this.radii.bottomLeft.height)},y.prototype.bottomRightCorner=function(){return new x(this.rect.maxX-this.radii.bottomRight.width,this.rect.maxY-this.radii.bottomRight.height,this.radii.bottomRight.width,this.radii.bottomRight.height)},y.prototype.isRounded=function(){function a(a){return a.width>0&&a.height>0}return a(this.radii.topLeft)||a(this.radii.topRight)||a(this.radii.bottomLeft)||a(this.radii.bottomRight)},y.prototype.cornersInsetRect=function(){var a=this.topLeftCorner(),b=this.topRightCorner(),c=this.bottomLeftCorner(),d=this.bottomRightCorner(),e=Math.max(a.maxX,c.maxX),f=Math.max(a.maxY,b.maxY);return new x(e,f,Math.min(b.x,d.x)-e,Math.min(c.y,d.y)-f)},y.prototype.scaleRadii=function(a){if(1!=a){var b=this.radii;b.topLeft.scale(a),b.topLeft.isEmpty()&&(b.topLeft=w.zeroSize),b.topRight.scale(a),b.topRight.isEmpty()&&(b.topRight=w.zeroSize),b.bottomLeft.scale(a),b.bottomLeft.isEmpty()&&(b.bottomLeft=w.zeroSize),b.bottomRight.scale(a),b.bottomRight.isEmpty()&&(b.bottomRight=w.zeroSize)}},y.prototype.isRenderable=function(){var a=this.radii,b=this.rect;return a.topLeft.width+a.topRight.width<=b.width&&a.bottomLeft.width+a.bottomRight.width<=b.width&&a.topLeft.height+a.bottomLeft.height<=b.height&&a.topRight.height+a.bottomRight.height<=b.height},y.prototype.adjustRadii=function(){var a=this.radii,b=Math.max(a.topLeft.width+a.topRight.width,a.bottomLeft.width+a.bottomRight.width),c=Math.max(a.topLeft.height+a.bottomLeft.height,a.topRight.height+a.bottomRight.height);if(0>=b||0>=c)return void(this.radii={topLeft:w.zeroSize,topRight:w.zeroSize,bottomRight:w.zeroSize,bottomLeft:w.zeroSize});var d=this.rect,e=d.width/b,f=d.height/c;this.scaleRadii(f>e?e:f)},y.prototype.minXInterceptAt=function(a,b){if(!this.rect.containsY(a))return b;var c,d=this.topLeftCorner();if(d.containsY(a))return c=d.maxY-a,d.maxX-z(c,d.width,d.height);var e=this.bottomLeftCorner();return e.containsY(a)?(c=a-e.y,e.maxX-z(c,e.width,e.height)):this.rect.x},y.prototype.maxXInterceptAt=function(a,b){if(!this.rect.containsY(a))return b;var c,d=this.topRightCorner();if(d.containsY(a))return c=d.maxY-a,d.x+z(c,d.width,d.height);var e=this.bottomRightCorner();return e.containsY(a)?(c=a-e.y,e.x+z(c,e.width,e.height)):this.rect.maxX},y.prototype.rightExclusionEdge=function(a,b){return this.rect.isEmpty()||!this.rect.overlapsYRange(a,b)?void 0:!this.isRounded()||this.cornersInsetRect().overlapsYRange(a,b)?this.rect.maxX:Math.max(this.maxXInterceptAt(a,this.rect.x),this.maxXInterceptAt(b,this.rect.x))},y.prototype.leftExclusionEdge=function(a,b){return this.rect.isEmpty()||!this.rect.overlapsYRange(a,b)?void 0:!this.isRounded()||this.cornersInsetRect().overlapsYRange(a,b)?this.rect.x:Math.min(this.minXInterceptAt(a,this.rect.maxX),this.minXInterceptAt(b,this.rect.maxX))},y.prototype.rightExclusionOffsets=F(y.prototype.topRightCorner,y.prototype.bottomRightCorner,E,C),y.prototype.leftExclusionOffsets=F(y.prototype.topLeftCorner,y.prototype.bottomLeftCorner,D,B),N.prototype.onReady=function(a){this.ready?a():this.callback=a},N.prototype.leftExclusionEdge=function(a){return this.geometry?this.geometry.leftExclusionEdge(a.top,a.bottom):a.left},N.prototype.rightExclusionEdge=function(a){return this.geometry?this.geometry.rightExclusionEdge(a.top,a.bottom):a.right},N.prototype.computeStepOffsets=function(a){for(var b,c=[],d=0;d<Math.ceil(this.metrics.marginBox.height/a);d++){var e={left:0,right:this.shapeValue.box.width,top:d*a,bottom:Math.min((d+1)*a,this.metrics.marginBox.height)};e.top-=this.metrics.margins[0]+this.shapeValue.box.y,e.bottom-=this.metrics.margins[0]+this.shapeValue.box.y,"left"===this.metrics.cssFloat?(b=this.rightExclusionEdge(e),b=void 0===b?0:b+this.shapeValue.box.x+this.metrics.margins[3]):(b=this.leftExclusionEdge(e),b=void 0===b?0:this.metrics.marginBox.width-(b+this.shapeValue.box.x+this.metrics.margins[3])),c.push({cssFloat:this.metrics.cssFloat,top:e.top+this.shapeValue.box.y+this.metrics.margins[0],bottom:e.bottom+this.shapeValue.box.y+this.metrics.margins[0],offset:Math.min(b,this.metrics.marginBox.width)})}return c},N.prototype.computeAdaptiveOffsets=function(a){for(var b=this.shapeValue.box.x+this.metrics.margins[3],c=this.metrics.margins[0]+this.shapeValue.box.y,d="left"===this.metrics.cssFloat?this.geometry.rightExclusionOffsets(-c,this.metrics.marginBox.height-c,a):this.geometry.leftExclusionOffsets(-c,this.metrics.marginBox.height-c,a),e=[],f=0,g=0;g<d.length;g++){var h;void 0===d[g].x?h=0:(h="left"==this.metrics.cssFloat?d[g].x+b:this.metrics.marginBox.width-(d[g].x+b),h=Math.min(h,this.metrics.marginBox.width)),e.push({offset:h,top:f,bottom:f+d[g].height,cssFloat:this.metrics.cssFloat}),f+=d[g].height}return e},N.prototype.offsets=function(a){return this.geometry instanceof y?"step"==(a&&a.mode)?this.computeStepOffsets(a.step):this.computeAdaptiveOffsets(a.limit):this.computeStepOffsets(a.step)},O.prototype.polyfill=function(a,b){var c=getComputedStyle(a);if(/left|right/.test(c.cssFloat)&&a.getAttribute("data-shape-outside")){var d=b&&b.step||parseInt(c.fontSize),e=b&&b.mode||"adaptive",f=b&&b.limit||1.8*d,g=new N(a),h=this;g.onReady(function(){var c=g.offsets({mode:e,limit:f,step:d});P(a,c),b&&b.callback&&"function"==typeof b.callback&&b.callback.call(h.scope)})}},O.prototype.removePolyfill=function(a){var b=a.parentNode;for(b=a.parentNode;b&&b.hasAttribute&&!b.hasAttribute("data-shape-outside-container");b=b.parentNode);b&&b.hasAttribute&&(b.parentNode.insertBefore(a,b),b.parentNode.removeChild(b))},O.prototype.run=function(a){var b=this,c=a&&a.force,d=(c&&(c===this.Force.Layout||c===this.Force.LayoutStyles),c&&(c===this.Force.Styles||c===this.Force.LayoutStyles));if(c===this.Force.LayoutStyles?a.force=this.Force.Layout:c&&delete a.force,void 0===this.hasNativeSupport){var e=document.createElement("div"),f=["shape-outside","-webkit-shape-outside"];f.forEach(function(a){e.style.setProperty(a,"content-box"),b.hasNativeSupport=b.hasNativeSupport||e.style.getPropertyValue(a)})}if(!this.hasNativeSupport||c){if(!this.stylesLoaded||d){this.stylesLoaded=!0,new _(function(c){c.forEach(function(a){for(var b=document.querySelectorAll(a.selector),c=0;c<b.length;c++)b[c].setAttribute("data-"+a.property,a.value)}),b.run(a)});var g=Q(function(){b.teardown(),b.run(a)},300);return void this.scope.addEventListener("resize",g)}for(var h=document.querySelectorAll("[data-shape-outside]"),i=0;i<h.length;i++)this.polyfill(h[i],a)}},O.prototype.teardown=function(){for(var a=document.querySelectorAll("[data-shape-outside]"),b=0;b<a.length;b++)this.removePolyfill(a[b])},O.prototype.Force={Layout:"force-layout",Styles:"force-styles",LayoutStyles:"force-layout-styles"},Object.freeze&&(O.prototype.Force=Object.freeze(O.prototype.Force)),R.prototype.parseUrl=function(a){var b=/url\((.*)\)/.exec(a);return b?(b=b[1],b=b.replace(/^['"]/,""),b=b.replace(/['"]$/,"")):null},R.prototype.parseBox=function(a,b){var c=/margin-box|border-box|padding-box|content-box/.exec(a);c=c?c[0]:"margin-box";var d=JSON.parse(JSON.stringify(b.borderBox.radii)),e={text:c,x:b.borderBox.x,y:b.borderBox.y,width:b.borderBox.width,height:b.borderBox.height,radii:d};switch(c){case"content-box":S(e,-1,[b.paddings,b.borders]),U(e.radii,-1,[b.paddings,b.borders]);break;case"padding-box":S(e,-1,[b.borders]),U(e.radii,-1,[b.borders]);break;case"border-box":break;case"margin-box":S(e,1,[b.margins]),U(e.radii,1,[b.margins])}return e},R.prototype.printShape=function(){if(this.shape)switch(this.shape.type){case"inset":return"inset("+this.shape.insets.join(" ")+" round "+V(this.shape.radii,0).join(" ")+" / "+V(this.shape.radii,1).join(" ")+")";case"circle":return"circle("+this.shape.r+" at "+this.shape.cx+" "+this.shape.cy+")";case"ellipse":return"ellipse("+this.shape.rx+" "+this.shape.ry+" at "+this.shape.cx+" "+this.shape.cy+")";case"polygon":return"polygon("+this.shape.fillRule+", "+this.shape.points.map(function(a){return a.x+" "+a.y}).join(", ")+")";default:return"not yet implemented for "+this.shape.type}return"no shape specified"},R.prototype.printBox=function(){return this.box?this.box.text+" { x: "+this.box.x+", y: "+this.box.y+", width: "+this.box.width+", height: "+this.box.height+", radii: "+V(this.box.radii,0).join(" ")+" / "+V(this.box.radii,1).join(" ")+" }":"no box specified"},R.prototype.parseBasicShape=function(a,b,c){var d=/(inset|circle|ellipse|polygon)\((.*)\)/.exec(a);if(!d)return null;var e=d[1],f=d[2]?d[2]:"";switch(e){case"inset":return this.parseInset(f,b,c);case"circle":return this.parseCircle(f,b,c);case"ellipse":return this.parseEllipse(f,b,c);case"polygon":return this.parsePolygon(f,b,c);default:return null}},R.prototype.parseInset=function(a,b,c){var d=/((?:[^r]|r(?!o))*)?\s*(?:round\s+([^\/]*)(?:\s*\/\s*(.*))?)?/;a=d.exec(a);var e={type:"inset",insets:[0,0,0,0],radii:[[0,0],[0,0],[0,0],[0,0]]};if(a&&a[1]){var f=a[1].trim();f=f.split(/\s+/),e.insets[0]=f[0],e.insets[1]=f.length>1?f[1]:e.insets[0],e.insets[2]=f.length>2?f[2]:e.insets[0],e.insets[3]=f.length>3?f[3]:e.insets[1],e.insets[0]=c.toPixels(e.insets[0],b.height),e.insets[1]=c.toPixels(e.insets[1],b.width),e.insets[2]=c.toPixels(e.insets[2],b.height),e.insets[3]=c.toPixels(e.insets[3],b.width)}var g;return a&&a[2]&&(g=a[2].trim(),g=g.split(/\s+/),g.length<2&&g.push(g[0]),g.length<3&&g.push(g[0]),g.length<4&&g.push(g[1]),e.radii=g.map(function(a){return a=c.toPixels(a,b.width),[a,a]})),a&&a[3]&&(g=a[3].trim(),g=g.split(/\s+/),g.length<2&&g.push(g[0]),g.length<3&&g.push(g[0]),g.length<4&&g.push(g[1]),g.forEach(function(a,d){e.radii[d][1]=c.toPixels(a,b.height)})),e.x=e.insets[3],e.y=e.insets[0],e.width=b.width-(e.insets[1]+e.insets[3]),e.height=b.height-(e.insets[0]+e.insets[2]),e},R.prototype.parseEllipsoid=function(a){var b=/((?:[^a]|a(?!t))*)?\s*(?:at\s+(.*))?/;a=b.exec(a);var c={};if(a&&a[1]){var d=a[1].trim();d=d.split(/\s+/),c.rx=d[0],c.ry=d.length>1?d[1]:d[0]}else c.rx=c.ry="closest-side";var e=[];if(a&&a[2]){var f=a[2].trim();f=f.split(/\s+/);var g=!1;f.forEach(function(a){/\d+/.test(a)&&g?e[e.length-1]+=" "+a:e.push(a),g=/top|bottom|left|right/.test(a)&&f.length>2})}for(;e.length<2;)e.push("center");if(/top|bottom/.test(e[0])||/left|right/.test(e[1])){var h=e[0];e[0]=e[1],e[1]=h}return c.cx=e[0],c.cy=e[1],c},R.prototype.parseCircle=function(a,b,c){var d=this.parseEllipsoid(a);return d.type="circle",d.cx=W(d.cx,b.width,c),d.cy=W(d.cy,b.height,c),d.r=X(d.rx,[Math.abs(d.cx),Math.abs(b.width-d.cx),Math.abs(d.cy),Math.abs(b.height-d.cy)],Math.sqrt((b.width*b.width+b.height*b.height)/2),c),delete d.rx,delete d.ry,d},R.prototype.parseEllipse=function(a,b,c){var d=this.parseEllipsoid(a);return d.type="ellipse",d.cx=W(d.cx,b.width,c),d.cy=W(d.cy,b.height,c),d.rx=X(d.rx,[Math.abs(d.cx),Math.abs(b.width-d.cx)],b.width,c),d.ry=X(d.ry,[Math.abs(d.cy),Math.abs(b.height-d.cy)],b.height,c),d},R.prototype.parsePolygon=function(a,b,c){a=a.split(/\s*,\s*/);var d="nonzero";a.length>0&&/nonzero|evenodd/.test(a[0])&&(d=a[0].trim(),a=a.slice(1));var e=a.map(function(a){var d=a.split(/\s+/);return{x:c.toPixels(d[0],b.width),y:c.toPixels(d[1],b.height)}});return{type:"polygon",fillRule:d,points:e}},R.prototype.computeClip=function(a,b){var c=b.margins[3],d=b.margins[0],e=b.margins[3]+b.margins[1],f=b.margins[0]+b.margins[2];return{x:-a.x-c,y:-a.y-d,width:b.borderBox.width+e,height:b.borderBox.height+f}},R.prototype.parseShapeMargin=function(a,b,c){return parseInt(a)?Math.max(0,c.toPixels(a,b.width)):0},R.prototype.parseShapeImageThreshold=function(a){var b=parseFloat(a);return b?Math.min(Math.max(0,b),1):0},Z.prototype.load=function(a,b,c){var d=this;if(this.url){var e=new XMLHttpRequest;e.onreadystatechange=function(){4===e.readyState&&(200===e.status?(d.cssText=e.responseText,a.call(c,d)):b.call(c,d))},e.open("GET",this.url);try{e.send(null)}catch(f){console.log("An error occurred loading a stylesheet, probably because we can't access the local file system"),b.call(c,d)}}else this.cssText=this.source.textContent,a.call(c,d)},$.prototype.init=function(){var a,b,c=Y(),d=c.length;for(this.queueCount=d,b=0;d>b;b++)a=new Z(c[b]),this.stylesheets.push(a),a.load(this.onStyleSheetLoad,this.onStyleSheetError,this)},$.prototype.onStyleSheetLoad=function(){this.queueCount--,this.onComplete.call(this)},$.prototype.onStyleSheetError=function(a){var b,c=this.stylesheets.length;for(b=0;c>b;b++)if(a.source===this.stylesheets[b].source)return this.stylesheets.splice(b,1),this.queueCount--,void this.onComplete.call(this)},$.prototype.onComplete=function(){0===this.queueCount&&this.callback.call(this,this.stylesheets)},_.prototype.onStylesLoaded=function(a){var b,c,d="\\s*([^{}]*[^\\s])\\s*{[^\\}]*",e="\\s*:\\s*((?:[^;\\(]|\\([^\\)]*\\))*)\\s*;",f=[],g=["shape-outside","shape-margin","shape-image-threshold"];
g.forEach(function(g){b=new RegExp(d+"("+g+")"+e,"ig"),a.forEach(function(a){for(;null!==(c=b.exec(a.cssText));)f.push({selector:c[1],property:c[2],value:c[3]})})}),this.callback(f)},a.ShapesPolyfill=new O(a)}(window);