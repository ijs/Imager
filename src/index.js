import * as EXIF from 'exif-js'
if (typeof Object.assign != 'function') {
    Object.assign = function (target) {
        'use strict'
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object')
        }

        target = Object(target)
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index]
            if (source != null) {
                for (var key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key]
                    }
                }
            }
        }
        return target
    }
}
export default class Imager {
    constructor(opts) {
        const defaults = {
            maxWidth: 1000,
            maxHeight: 1000,
            quality: 0.9,
            isLimit: true, // 是否限制宽高
            exifdata: {
                Orientation: ''
            }

        }

        Object.assign(this, defaults, opts)
    }

    static supportFileReader() {
        return !!window.FileReader
    }

    static supportFile() {
        return window.File && window.atob && window.Uint8Array
    }

    static isImage(file) {
        return file.type.indexOf('image') > -1
    }

    // transfer base64 to file need the methods supportFile
    static base64ToFile(dataurl, filename) {
        if (!Imager.supportFile()) {
            return dataurl
        }

        let arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length, u8arr = new Uint8Array(n)
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
        }
        return new File([u8arr], filename, { type: mime })
    }
    /**
     * @params file
     * @return Promise
     */
    static fileToBase64(file) {
        if (!Imager.supportFileReader()) {
            return Promise.reject(new Error('browser not support FileReader'))
        }

        let oReader = new FileReader()
        oReader.readAsDataURL(file)
        return new Promise((resolve, reject) => {
            oReader.addEventListener('load', () => resolve(oReader.result))
            oReader.addEventListener('error', reject)
        })
    }

    expectSize (image) {
        let width, height, nw, nh
        let {maxWidth , maxHeight} = this

        width = nw = image.naturalWidth
        height = nh = image.naturalHeight

        if (this.isLimit) {
            if (nw > nh && nw > maxWidth) {
                width = maxWidth
                height = width * nh / nw
            } else if (nh > nw && nh > maxHeight) {
                height = maxHeight
                width = height * nw / nh
            }
        }
        return { width, height }
    }

    static rotateImg(img, direction, canvas) {
        var min_step = 0
        var max_step = 3
        if (img == null) return

        var height = img.height
        var width = img.width
        var step = 2
        if (step == null) {
            step = min_step
        }
        if (direction == 'right') {
            step++
            step > max_step && (step = min_step)
        } else {
            step--
            step < min_step && (step = max_step)
        }
        var degree = step * 90 * Math.PI / 180
        var ctx = canvas.getContext('2d')
        switch (step) {
            case 0:
                canvas.width = width
                canvas.height = height
                ctx.drawImage(img, 0, 0)
                break
            case 1:
                canvas.width = height
                canvas.height = width
                ctx.rotate(degree)
                ctx.drawImage(img, 0, -height)
                break
            case 2:
                canvas.width = width
                canvas.height = height
                ctx.rotate(degree)
                ctx.drawImage(img, -width, -height)
                break
            case 3:
                canvas.width = height
                canvas.height = width
                ctx.rotate(degree)
                ctx.drawImage(img, -width, 0)
                break
        }
    }

    loaded() {
        let image = new Image()
        let maxWidth = this.maxWidth
        let maxHeight = this.maxHeight
        const orientation = this.file.exifdata.Orientation
        const quality = this.quality
        return Imager.fileToBase64(this.file).then((base64) => {
            image.src = base64
            return new Promise((resolve, reject) => {
                image.addEventListener('load', () => {
                    let canvas, ctx
                    let { width , height } = this.expectSize(image)

                    canvas = document.createElement("canvas")
                    ctx = canvas.getContext("2d")
                    canvas.width = width
                    canvas.height = height
                    ctx.drawImage(image, 0, 0, width, height)

                    if (orientation != "" && orientation != 1) {
                        switch (orientation) {
                            case 6://需要顺时针（向左）90度旋转
                                Imager.rotateImg(image, 'left', canvas)
                                break
                            case 8://需要逆时针（向右）90度旋转
                                Imager.rotateImg(image, 'right', canvas)
                                break
                            case 3://需要180度旋转
                                Imager.rotateImg(image, 'right', canvas);//转两次
                                Imager.rotateImg(image, 'right', canvas)
                                break
                        }
                    }

                    resolve(canvas.toDataURL("image/png", quality))
                })
                image.addEventListener('err', reject)
            })
        })
    }

    getExif() {
        return new Promise(resolve => {
            EXIF.getData(this.file, () => {
                EXIF.getAllTags(this.file)
                resolve(this.file)
            })
        })
    }
}
