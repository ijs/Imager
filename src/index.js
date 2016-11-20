import * as EXIF from 'exif-js'
export default class Imager {
	constructor(opts) {
		const defaults = {
			maxWidth: 1000,
			maxHeight: 1000,
			quality: 0.9,
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
		if(!Imager.supportFile()) {
			return dataurl
		}
		
		let arr = dataurl.split(','),
			mime = arr[0].match(/:(.*?);/)[1],
			bstr = atob(arr[1]),
			n = bstr.length, u8arr = new Uint8Array(n)
		while(n--) {
			u8arr[n] = bstr.charCodeAt(n)
		}
		return new File([u8arr], filename, {type: mime})
	}
	
	static rotateImg(img, direction, canvas) {
		var min_step = 0
		var max_step = 3
		if(img == null) return
		
		var height = img.height
		var width = img.width
		var step = 2
		if(step == null) {
			step = min_step
		}
		if(direction == 'right') {
			step++
			step > max_step && (step = min_step)
		} else {
			step--
			step < min_step && (step = max_step)
		}
		var degree = step * 90 * Math.PI / 180
		var ctx = canvas.getContext('2d')
		switch(step) {
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
		if(!Imager.supportFileReader()) {
			console.warn('browser not support FileReader')
			return
		}
		let oReader = new FileReader()
		let image = new Image()
		let maxWidth = this.maxWidth
		let maxHeight = this.maxHeight
		const orientation = this.file.exifdata.Orientation
		const quality = this.quality
		oReader.readAsDataURL(this.file)
		return new Promise((resolve, reject) => {
			
			oReader.addEventListener('load', () => {
				let base64
				image.src = oReader.result
				image.onload = function() {
					let expectWidth = this.naturalWidth
					let expectHeight = this.naturalHeight
					
					if(this.naturalWidth > this.naturalHeight && this.naturalWidth > maxWidth) {
						expectWidth = maxWidth
						expectHeight = expectWidth * this.naturalHeight / this.naturalWidth
					} else if(this.naturalHeight > this.naturalWidth && this.naturalHeight > maxHeight) {
						expectHeight = maxHeight
						expectWidth = expectHeight * this.naturalWidth / this.naturalHeight
					}
					var canvas = document.createElement("canvas")
					var ctx = canvas.getContext("2d")
					canvas.width = expectWidth
					canvas.height = expectHeight
					ctx.drawImage(this, 0, 0, expectWidth, expectHeight)
					if(orientation != "" && orientation != 1) {
						switch(orientation) {
							case 6://需要顺时针（向左）90度旋转
								Imager.rotateImg(this, 'left', canvas)
								break
							case 8://需要逆时针（向右）90度旋转
								Imager.rotateImg(this, 'right', canvas)
								break
							case 3://需要180度旋转
								Imager.rotateImg(this, 'right', canvas);//转两次
								Imager.rotateImg(this, 'right', canvas)
								break
						}
					}
					
					resolve(canvas.toDataURL("image/jpeg", quality))
				}
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
