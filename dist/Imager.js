/*!
 * Imager v0.1.5
 * (c) 2017 321jiangtao@gmail.com
 * Released under the  License.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('exif-js')) :
  typeof define === 'function' && define.amd ? define(['exif-js'], factory) :
  (global.Imager = factory(global.EXIF));
}(this, (function (EXIF) { 'use strict';

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

if (typeof Object.assign != 'function') {
    Object.assign = function (target) {
        'use strict';

        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        target = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index];
            if (source != null) {
                for (var key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key];
                    }
                }
            }
        }
        return target;
    };
}

var Imager = function () {
    function Imager(opts) {
        classCallCheck(this, Imager);

        var defaults = {
            maxWidth: 1000,
            maxHeight: 1000,
            quality: 0.9,
            isLimit: true, // 是否限制宽高
            exifdata: {
                Orientation: ''
            }

        };

        Object.assign(this, defaults, opts);
    }

    createClass(Imager, [{
        key: 'expectSize',
        value: function expectSize(image) {
            var width = void 0,
                height = void 0,
                nw = void 0,
                nh = void 0;
            var maxWidth = this.maxWidth,
                maxHeight = this.maxHeight;


            width = nw = image.naturalWidth;
            height = nh = image.naturalHeight;

            if (this.isLimit) {
                if (nw > nh && nw > maxWidth) {
                    width = maxWidth;
                    height = width * nh / nw;
                } else if (nh > nw && nh > maxHeight) {
                    height = maxHeight;
                    width = height * nw / nh;
                }
            }
            return { width: width, height: height };
        }
    }, {
        key: 'loaded',
        value: function loaded() {
            var _this = this;

            var image = new Image();
            var maxWidth = this.maxWidth;
            var maxHeight = this.maxHeight;
            var orientation = this.file.exifdata.Orientation;
            var quality = this.quality;
            return Imager.fileToBase64(this.file).then(function (base64) {
                image.src = base64;
                return new Promise(function (resolve, reject) {
                    image.addEventListener('load', function () {
                        var canvas = void 0,
                            ctx = void 0;

                        var _expectSize = _this.expectSize(image),
                            width = _expectSize.width,
                            height = _expectSize.height;

                        canvas = document.createElement("canvas");
                        ctx = canvas.getContext("2d");
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(image, 0, 0, width, height);

                        if (orientation != "" && orientation != 1) {
                            switch (orientation) {
                                case 6:
                                    //需要顺时针（向左）90度旋转
                                    Imager.rotateImg(_this, 'left', canvas);
                                    break;
                                case 8:
                                    //需要逆时针（向右）90度旋转
                                    Imager.rotateImg(_this, 'right', canvas);
                                    break;
                                case 3:
                                    //需要180度旋转
                                    Imager.rotateImg(_this, 'right', canvas); //转两次
                                    Imager.rotateImg(_this, 'right', canvas);
                                    break;
                            }
                        }

                        resolve(canvas.toDataURL("image/jpeg", quality));
                    });
                    image.addEventListener('err', reject);
                });
            });
        }
    }, {
        key: 'getExif',
        value: function getExif() {
            var _this2 = this;

            return new Promise(function (resolve) {
                EXIF.getData(_this2.file, function () {
                    EXIF.getAllTags(_this2.file);
                    resolve(_this2.file);
                });
            });
        }
    }], [{
        key: 'supportFileReader',
        value: function supportFileReader() {
            return !!window.FileReader;
        }
    }, {
        key: 'supportFile',
        value: function supportFile() {
            return window.File && window.atob && window.Uint8Array;
        }
    }, {
        key: 'isImage',
        value: function isImage(file) {
            return file.type.indexOf('image') > -1;
        }

        // transfer base64 to file need the methods supportFile

    }, {
        key: 'base64ToFile',
        value: function base64ToFile(dataurl, filename) {
            if (!Imager.supportFile()) {
                return dataurl;
            }

            var arr = dataurl.split(','),
                mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]),
                n = bstr.length,
                u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], filename, { type: mime });
        }
        /**
         * @params file
         * @return Promise
         */

    }, {
        key: 'fileToBase64',
        value: function fileToBase64(file) {
            if (!Imager.supportFileReader()) {
                return Promise.reject(new Error('browser not support FileReader'));
            }

            var oReader = new FileReader();
            oReader.readAsDataURL(file);
            return new Promise(function (resolve, reject) {
                oReader.addEventListener('load', function () {
                    return resolve(oReader.result);
                });
                oReader.addEventListener('error', reject);
            });
        }
    }, {
        key: 'rotateImg',
        value: function rotateImg(img, direction, canvas) {
            var min_step = 0;
            var max_step = 3;
            if (img == null) return;

            var height = img.height;
            var width = img.width;
            var step = 2;
            if (step == null) {
                step = min_step;
            }
            if (direction == 'right') {
                step++;
                step > max_step && (step = min_step);
            } else {
                step--;
                step < min_step && (step = max_step);
            }
            var degree = step * 90 * Math.PI / 180;
            var ctx = canvas.getContext('2d');
            switch (step) {
                case 0:
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0);
                    break;
                case 1:
                    canvas.width = height;
                    canvas.height = width;
                    ctx.rotate(degree);
                    ctx.drawImage(img, 0, -height);
                    break;
                case 2:
                    canvas.width = width;
                    canvas.height = height;
                    ctx.rotate(degree);
                    ctx.drawImage(img, -width, -height);
                    break;
                case 3:
                    canvas.width = height;
                    canvas.height = width;
                    ctx.rotate(degree);
                    ctx.drawImage(img, -width, 0);
                    break;
            }
        }
    }]);
    return Imager;
}();

return Imager;

})));