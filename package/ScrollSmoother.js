function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/*!
 * ScrollSmoother 3.10.1
 * https://greensock.com
 *
 * @license Copyright 2008-2022, GreenSock. All rights reserved.
 * Subject to the terms at https://greensock.com/standard-license or for
 * Club GreenSock members, the agreement issued with that membership.
 * @author: Jack Doyle, jack@greensock.com
*/

/* eslint-disable */
var gsap,
    _coreInitted,
    _win,
    _doc,
    _docEl,
    _body,
    _root,
    _toArray,
    _clamp,
    ScrollTrigger,
    _mainInstance,
    _expo,
    _getVelocityProp,
    _windowExists = function _windowExists() {
  return typeof window !== "undefined";
},
    _getGSAP = function _getGSAP() {
  return gsap || _windowExists() && (gsap = window.gsap) && gsap.registerPlugin && gsap;
},
    _bonusValidated = 1,
    //<name>ScrollSmoother</name>
_isViewport = function _isViewport(e) {
  return !!~_root.indexOf(e);
},
    _getTime = Date.now,
    _round = function _round(value) {
  return Math.round(value * 100000) / 100000 || 0;
},
    _autoDistance = function _autoDistance(el, progress) {
  // for calculating the distance (and offset) for elements with speed: "auto". Progress is for if it's "above the fold" (negative start position), so we can crop as little as possible.
  var parent = el.parentNode || _docEl,
      b1 = el.getBoundingClientRect(),
      b2 = parent.getBoundingClientRect(),
      gapTop = b2.top - b1.top,
      gapBottom = b2.bottom - b1.bottom,
      change = (Math.abs(gapTop) > Math.abs(gapBottom) ? gapTop : gapBottom) / (1 - progress),
      offset = -change * progress,
      ratio,
      extraChange;

  if (change > 0) {
    // if the image starts at the BOTTOM of the container, adjust things so that it shows as much of the image as possible while still covering.
    ratio = b2.height / (_win.innerHeight + b2.height);
    extraChange = ratio === 0.5 ? b2.height * 2 : Math.min(b2.height, -change * ratio / (2 * ratio - 1)) * 2;
    offset += -extraChange / 2; // whatever the offset, we must double that in the opposite direction to compensate.

    change += extraChange;
  }

  return {
    change: change,
    offset: offset
  };
},
    _wrap = function _wrap(el) {
  var wrapper = _doc.createElement("div");

  wrapper.classList.add("ScrollSmoother-wrapper");
  el.parentNode.insertBefore(wrapper, el);
  wrapper.appendChild(el);
  return wrapper;
};

export var ScrollSmoother = /*#__PURE__*/function () {
  function ScrollSmoother(vars) {
    var _this = this;

    _coreInitted || ScrollSmoother.register(gsap) || console.warn("Please gsap.registerPlugin(ScrollSmoother)");
    vars = this.vars = vars || {};
    _mainInstance && _mainInstance.kill();
    _mainInstance = this;

    var content,
        wrapper,
        height,
        mainST,
        effects,
        intervalID,
        wrapperCSS,
        contentCSS,
        paused,
        pausedNormalizer,
        scrollFunc = ScrollTrigger.getScrollFunc(_win),
        smoothDuration = ScrollTrigger.isTouch === 1 ? vars.smoothTouch === true ? 0.8 : parseFloat(vars.smoothTouch) || 0 : vars.smooth === 0 || vars.smooth === false ? 0 : parseFloat(vars.smooth) || 0.8,
        currentY = 0,
        delta = 0,
        startupPhase = 1,
        _onUpdate = vars.onUpdate,
        onStop = vars.onStop,
        tracker = _getVelocityProp(0),
        updateVelocity = function updateVelocity() {
      return tracker.update(-currentY);
    },
        scroll = {
      y: 0
    },
        removeScroll = function removeScroll() {
      return content.style.overflow = "visible";
    },
        isProxyScrolling,
        killScrub = function killScrub(trigger) {
      var scrub = trigger.getTween();

      if (scrub) {
        scrub.pause();
        scrub._time = scrub._dur; // force the playhead to completion without rendering just so that when it resumes, it doesn't jump back in the .resetTo().

        scrub._tTime = scrub._tDur;
      }

      isProxyScrolling = false;
      trigger.animation.progress(trigger.progress, true);
    },
        render = function render(y, force) {
      if (y !== currentY && !paused || force) {
        smoothDuration && (content.style.transform = "matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, " + y + ", 0, 1)"); //smoothDuration && (content.style.transform = "translateY(" + y + "px)"); // NOTE: when we used matrix3d() or set will-change: transform, it performed noticeably worse on iOS counter-intuitively!

        delta = y - currentY;
        currentY = y;
        ScrollTrigger.isUpdating || ScrollTrigger.update();
      }
    },
        scrollTop = function scrollTop(value) {
      if (arguments.length) {
        paused && (currentY = -value);
        scroll.y = -value;
        isProxyScrolling = true; // otherwise, if snapping was applied (or anything that attempted to SET the scroll proxy's scroll position), we'd set the scroll here which would then (on the next tick) update the content tween/ScrollTrigger which would try to smoothly animate to that new value, thus the scrub tween would impede the progress. So we use this flag to respond accordingly in the ScrollTrigger's onUpdate and effectively force the scrub to its end immediately.

        scrollFunc(value);
        return this;
      }

      return -currentY;
    },
        lastFocusElement,
        // if the user clicks a button that scrolls the page, for example, then unfocuses the window and comes back and activates the window/tab again, it'll want to focus back on that same button element but in that case we should skip it. Only jump there when a new element gets focus, like tabbing for accessibility.
    onFocusIn = function onFocusIn(e) {
      // when the focus changes, make sure that element is on-screen
      wrapper.scrollTop = 0;
      ScrollTrigger.isInViewport(e.target) || e.target === lastFocusElement || _this.scrollTo(e.target, false, "center center");
      lastFocusElement = e.target;
    },
        adjustParallaxPosition = function adjustParallaxPosition(triggers, createdAfterEffectWasApplied) {
      var pins, start, dif, markers;
      effects.forEach(function (st) {
        pins = st.pins;
        markers = st.markers;
        triggers.forEach(function (trig) {
          if ((trig.trigger === st.trigger || trig.pinnedContainer === st.trigger) && st !== trig) {
            start = trig.start;
            dif = (start - st.start - st.offset) / st.ratio - (start - st.start); // createdAfterEffectWasApplied && (dif -= (gsap.getProperty(st.trigger, "y") - st.startY) / st.ratio); // the effect applied a y offset, so if the ScrollTrigger was created after that, it'll be based on that position so we must compensate. Later we added code to ScrollTrigger to roll back in this situation anyway, so this isn't necessary. Saving it in case a situation arises where it comes in handy.

            pins.forEach(function (p) {
              return dif -= p.distance / st.ratio - p.distance;
            });
            trig.setPositions(start + dif, trig.end + dif);
            trig.markerStart && markers.push(gsap.quickSetter([trig.markerStart, trig.markerEnd], "y", "px"));

            if (trig.pin && trig.end > 0) {
              dif = trig.end - trig.start;
              pins.push({
                start: trig.start,
                end: trig.end,
                distance: dif,
                trig: trig
              });
              st.setPositions(st.start, st.end + dif);
              st.vars.onRefresh(st);
            }
          }
        });
      });
    },
        onRefresh = function onRefresh() {
      removeScroll();
      requestAnimationFrame(removeScroll);

      if (effects) {
        // adjust all the effect start/end positions including any pins!
        effects.forEach(function (st) {
          var start = st.start,
              end = st.auto ? Math.min(ScrollTrigger.maxScroll(st.scroller), st.end) : start + (st.end - start) / st.ratio,
              offset = (end - st.end) / 2; // we split the difference so that it reaches its natural position in the MIDDLE of the viewport

          start -= offset;
          end -= offset;
          st.offset = offset || 0.0001; // we assign at least a tiny value because we check in the onUpdate for .offset being set in order to apply values.

          st.pins.length = 0;
          st.setPositions(Math.min(start, end), Math.max(start, end));
          st.vars.onRefresh(st);
        });
        adjustParallaxPosition(ScrollTrigger.sort());
      }

      tracker.reset();
    },
        restoreEffects = function restoreEffects() {
      return effects && effects.forEach(function (st) {
        return st.vars.onRefresh(st);
      });
    },
        revertEffects = function revertEffects() {
      effects && effects.forEach(function (st) {
        return st.vars.onRefreshInit(st);
      });
      return restoreEffects;
    },
        effectValueGetter = function effectValueGetter(name, value, index, el) {
      return function () {
        var v = typeof value === "function" ? value(index, el) : value;
        v || v === 0 || (v = el.getAttribute("data-" + name) || (name === "speed" ? 1 : 0));
        el.setAttribute("data-" + name, v);
        return v === "auto" ? v : parseFloat(v);
      };
    },
        createEffect = function createEffect(el, speed, lag, index) {
      var getSpeed = effectValueGetter("speed", speed, index, el),
          getLag = effectValueGetter("lag", lag, index, el),
          startY = gsap.getProperty(el, "y"),
          cache = el._gsap,
          ratio,
          st,
          autoSpeed,
          scrub,
          progressOffset,
          yOffset,
          initDynamicValues = function initDynamicValues() {
        speed = getSpeed();
        lag = getLag();
        ratio = parseFloat(speed) || 1;
        autoSpeed = speed === "auto";
        progressOffset = autoSpeed ? 0 : 0.5;
        scrub && scrub.kill();
        scrub = lag && gsap.to(el, {
          ease: _expo,
          overwrite: false,
          y: "+=0",
          duration: lag
        });

        if (st) {
          st.ratio = ratio;
          st.autoSpeed = autoSpeed;
        }
      },
          revert = function revert() {
        cache.y = startY + "px";
        cache.renderTransform(1);
        initDynamicValues();
      },
          pins = [],
          markers = [],
          change = 0,
          updateChange = function updateChange(self) {
        if (autoSpeed) {
          revert();

          var auto = _autoDistance(el, _clamp(0, 1, -self.start / (self.end - self.start)));

          change = auto.change;
          yOffset = auto.offset;
        } else {
          change = (self.end - self.start) * (1 - ratio);
          yOffset = 0;
        }

        pins.forEach(function (p) {
          return change -= p.distance * (1 - ratio);
        });
        self.vars.onUpdate(self);
        scrub && scrub.progress(1);
      };

      initDynamicValues();

      if (ratio !== 1 || autoSpeed || scrub) {
        st = ScrollTrigger.create({
          trigger: autoSpeed ? el.parentNode : el,
          scroller: wrapper,
          scrub: true,
          refreshPriority: -999,
          // must update AFTER any other ScrollTrigger pins
          onRefreshInit: revert,
          onRefresh: updateChange,
          onKill: function onKill(self) {
            var i = effects.indexOf(self);
            i >= 0 && effects.splice(i, 1);
          },
          onUpdate: function onUpdate(self) {
            var y = startY + change * (self.progress - progressOffset),
                i = pins.length,
                extraY = 0,
                pin,
                scrollY,
                end;

            if (self.offset) {
              // wait until the effects are adjusted.
              if (i) {
                // pinning must be handled in a special way because when pinned, slope changes to 1.
                scrollY = -scroll.y;
                end = self.end;

                while (i--) {
                  pin = pins[i];

                  if (pin.trig.isActive || scrollY >= pin.start && scrollY <= pin.end) {
                    // currently pinned so no need to set anything
                    if (scrub) {
                      pin.trig.progress += pin.trig.direction < 0 ? 0.001 : -0.001; // just to make absolutely sure that it renders (if the progress didn't change, it'll skip)

                      pin.trig.update(0, 0, 1);
                      scrub.resetTo("y", parseFloat(cache.y), -delta, true);
                      startupPhase && scrub.progress(1);
                    }

                    return;
                  }

                  scrollY > pin.end && (extraY += pin.distance);
                  end -= pin.distance;
                }

                y = startY + extraY + change * ((gsap.utils.clamp(self.start, self.end, scrollY) - self.start - extraY) / (end - self.start) - progressOffset);
              }

              y = _round(y + yOffset);
              markers.length && !autoSpeed && markers.forEach(function (setter) {
                return setter(y - extraY);
              });

              if (scrub) {
                scrub.resetTo("y", y, -delta, true);
                startupPhase && scrub.progress(1);
              } else {
                cache.y = y + "px";
                cache.renderTransform(1);
              }
            }
          }
        });
        updateChange(st);
        gsap.core.getCache(st.trigger).stRevert = revertEffects; // if user calls ScrollSmoother.create() with effects and THEN creates a ScrollTrigger on the same trigger element, the effect would throw off the start/end positions thus we needed a way to revert things when creating a new ScrollTrigger in that scenario, so we use this stRevert property of the GSCache inside ScrollTrigger.

        st.startY = startY;
        st.pins = pins;
        st.markers = markers;
        st.ratio = ratio;
        st.autoSpeed = autoSpeed;
        el.style.willChange = "transform";
      }

      return st;
    };

    ScrollTrigger.addEventListener("refresh", onRefresh);
    gsap.delayedCall(0.5, function () {
      return startupPhase = 0;
    });
    this.scrollTop = scrollTop;

    this.scrollTo = function (target, smooth, position) {
      var p = gsap.utils.clamp(0, ScrollTrigger.maxScroll(_win), isNaN(target) ? _this.offset(target, position) : +target);
      !smooth ? scrollTop(p) : paused ? gsap.to(_this, {
        duration: smoothDuration,
        scrollTop: p,
        overwrite: "auto",
        ease: _expo
      }) : scrollFunc(p);
    };

    this.offset = function (target, position) {
      target = _toArray(target)[0];
      var oldY = gsap.getProperty(target, "y"),
          // because if there's an effect applied, we revert(). We need to restore.
      st = ScrollTrigger.create({
        trigger: target,
        start: position || "top top"
      }),
          y;
      effects && adjustParallaxPosition([st], true);
      y = st.start;
      st.kill(false);
      gsap.set(target, {
        y: oldY
      });
      return y;
    };

    function refreshHeight() {
      height = content.clientHeight;
      content.style.overflow = "visible";
      _body.style.height = height + "px";
      return height - _win.innerHeight;
    }

    this.content = function (element) {
      if (arguments.length) {
        content = _toArray(element || "#smooth-content")[0] || _body.children[0];
        contentCSS = content.getAttribute("style") || "";
        gsap.set(content, {
          overflow: "visible",
          width: "100%"
        });
        return this;
      }

      return content;
    };

    this.wrapper = function (element) {
      if (arguments.length) {
        wrapper = _toArray(element || "#smooth-wrapper")[0] || _wrap(content);
        wrapperCSS = wrapper.getAttribute("style") || "";
        refreshHeight();
        gsap.set(wrapper, smoothDuration ? {
          overflow: "hidden",
          position: "fixed",
          height: "100%",
          width: "100%",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        } : {
          overflow: "visible",
          position: "relative",
          width: "100%",
          height: "auto",
          top: "auto",
          bottom: "auto",
          left: "auto",
          right: "auto"
        });
        return this;
      }

      return wrapper;
    };

    this.effects = function (targets, _ref) {
      var _effects;

      var speed = _ref.speed,
          lag = _ref.lag;
      effects || (effects = []);

      if (!targets) {
        return effects.slice(0);
      }

      targets = _toArray(targets);
      targets.forEach(function (target) {
        var i = effects.length;

        while (i--) {
          if (effects[i].trigger === target) {
            effects[i].kill();
            effects.splice(i, 1);
          }
        }
      });
      var effectsToAdd = [],
          i,
          st;

      for (i = 0; i < targets.length; i++) {
        st = createEffect(targets[i], speed, lag, i);
        st && effectsToAdd.push(st);
      }

      (_effects = effects).push.apply(_effects, effectsToAdd);

      return effectsToAdd;
    };

    this.content(vars.content);
    this.wrapper(vars.wrapper);

    this.render = function (y) {
      return render(y || y === 0 ? y : currentY);
    };

    this.getVelocity = function () {
      return tracker.getVelocity(-currentY);
    };

    ScrollTrigger.scrollerProxy(wrapper, {
      scrollTop: scrollTop,
      scrollHeight: function scrollHeight() {
        return _body.scrollHeight;
      },
      fixedMarkers: vars.fixedMarkers !== false && !!smoothDuration,
      content: content,
      getBoundingClientRect: function getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: _win.innerWidth,
          height: _win.innerHeight
        };
      }
    });
    ScrollTrigger.defaults({
      scroller: wrapper
    });
    var existingScrollTriggers = ScrollTrigger.getAll().filter(function (st) {
      return st.scroller === _win || st.scroller === wrapper;
    });
    existingScrollTriggers.forEach(function (st) {
      return st.revert(true);
    }); // in case it's in an environment like React where child components that have ScrollTriggers instantiate BEFORE the parent that does ScrollSmoother.create(...);

    mainST = ScrollTrigger.create({
      animation: gsap.to(scroll, {
        y: function y() {
          return _win.innerHeight - height;
        },
        ease: "none",
        data: "ScrollSmoother",
        duration: 100,
        // for added precision
        onUpdate: function onUpdate() {
          var force = isProxyScrolling;

          if (force) {
            scroll.y = currentY;
            killScrub(mainST);
          }

          render(scroll.y, force);
          updateVelocity();
          _onUpdate && !paused && _onUpdate(_this);
        }
      }),
      onRefreshInit: function onRefreshInit() {
        return scroll.y = 0;
      },
      id: "ScrollSmoother",
      scroller: _win,
      invalidateOnRefresh: true,
      start: 0,
      refreshPriority: -9999,
      // because all other pins, etc. should be calculated first before this figures out the height of the body. BUT this should also update FIRST so that the scroll position on the proxy is up-to-date when all the ScrollTriggers calculate their progress! -9999 is a special number that ScrollTrigger looks for to handle in this way.
      end: refreshHeight,
      onScrubComplete: function onScrubComplete() {
        tracker.reset();
        onStop && onStop(_this);
      },
      scrub: smoothDuration || true,
      onRefresh: function onRefresh(self) {
        killScrub(self);
        render(scroll.y);
      }
    });

    this.smooth = function (value) {
      smoothDuration = value;
      return arguments.length ? mainST.scrubDuration(value) : mainST.getTween() ? mainST.getTween().duration() : 0;
    };

    mainST.getTween() && (mainST.getTween().vars.ease = vars.ease || _expo);
    this.scrollTrigger = mainST;
    vars.effects && this.effects(vars.effects === true ? "[data-speed], [data-lag]" : vars.effects, {});
    existingScrollTriggers.forEach(function (st) {
      st.vars.scroller = wrapper;
      st.init(st.vars, st.animation);
    });

    this.paused = function (value) {
      if (arguments.length) {
        if (!!paused !== value) {
          if (value) {
            // pause
            mainST.getTween() && mainST.getTween().pause();
            scrollFunc(-currentY);
            tracker.reset();
            pausedNormalizer = ScrollTrigger.normalizeScroll();
            pausedNormalizer && pausedNormalizer.disable(); // otherwise the normalizer would try to scroll the page on things like wheel events.

            paused = ScrollTrigger.observe({
              preventDefault: true,
              type: "wheel,touch,scroll",
              debounce: false,
              onChangeY: function onChangeY() {
                return scrollTop(-currentY);
              } // refuse to scroll

            });
          } else {
            // resume
            paused.kill();
            paused = 0;
            pausedNormalizer && pausedNormalizer.enable();
            mainST.progress = (-currentY - mainST.start) / (mainST.end - mainST.start);
            killScrub(mainST);
          }
        }

        return this;
      }

      return !!paused;
    };

    this.kill = function () {
      _this.paused(false);

      killScrub(mainST);
      mainST.kill();
      var i = effects ? effects.length : 0;

      while (i--) {
        // make sure we go backwards because the onKill() will effects.splice(index, 1) and we don't want to skip
        effects[i].kill();
      }

      ScrollTrigger.scrollerProxy(wrapper);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      wrapper.style.cssText = wrapperCSS;
      content.style.cssText = contentCSS;
      var defaults = ScrollTrigger.defaults({});
      defaults && defaults.scroller === wrapper && ScrollTrigger.defaults({
        scroller: _win
      });
      _this.observer && ScrollTrigger.normalizeScroll(false);
      clearInterval(intervalID);
      _mainInstance = null;

      _win.removeEventListener("focusin", onFocusIn);
    };

    vars.normalizeScroll && (this.observer = ScrollTrigger.normalizeScroll({
      debounce: true
    }));
    ScrollTrigger.config(vars); // in case user passes in ignoreMobileResize for example

    gsap.set(_body, {
      overscrollBehavior: "none"
    }); // if the user hits the tab key (or whatever) to shift focus to an element that's off-screen, center that element.

    _win.addEventListener("focusin", onFocusIn);

    intervalID = setInterval(updateVelocity, 250);
    _doc.readyState === "loading" || requestAnimationFrame(function () {
      return ScrollTrigger.refresh();
    });
  }

  ScrollSmoother.register = function register(core) {
    if (!_coreInitted) {
      gsap = core || _getGSAP();

      if (_windowExists() && window.document) {
        _win = window;
        _doc = document;
        _docEl = _doc.documentElement;
        _body = _doc.body;
      }

      if (gsap) {
        _toArray = gsap.utils.toArray;
        _clamp = gsap.utils.clamp;
        _expo = gsap.parseEase("expo");
        ScrollTrigger = gsap.core.globals().ScrollTrigger;
        gsap.core.globals("ScrollSmoother", ScrollSmoother); // must register the global manually because in Internet Explorer, functions (classes) don't have a "name" property.
        //	gsap.ticker.lagSmoothing(50, 100); // generally people don't want things to jump (honoring smoothness over time is better with smooth scrolling)

        if (_body && ScrollTrigger) {
          _root = [_win, _doc, _docEl, _body];
          _getVelocityProp = ScrollTrigger.core._getVelocityProp;
          _coreInitted = 1;
        }
      }
    }

    return _coreInitted;
  };

  _createClass(ScrollSmoother, [{
    key: "progress",
    get: function get() {
      return this.scrollTrigger.animation._time / 100;
    }
  }]);

  return ScrollSmoother;
}();
ScrollSmoother.version = "3.10.1";

ScrollSmoother.create = function (vars) {
  return _mainInstance && vars && _mainInstance.content() === _toArray(vars.content)[0] ? _mainInstance : new ScrollSmoother(vars);
};

ScrollSmoother.get = function () {
  return _mainInstance;
};

_getGSAP() && gsap.registerPlugin(ScrollSmoother);
export { ScrollSmoother as default };