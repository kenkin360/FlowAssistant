var Upscale=Function.extend(Object, function () {
	var _=this(Upscale);
	Upscale=_[Upscale];

	function Upscale() {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_websr=null;
		$this.m_weights=null;
	}

	_['protected'].GetWebSR=async function () {
		let $this=_(this);
		if (!$this.m_websr) {
			$this.m_websr=new Resource.Module('WebSR', 'https://esm.sh/gh/sb2702/websr/dist/websr.js?raw');
		}
		try { return await $this.m_websr; }
		catch (error) { $this.m_websr=null; throw error; }
	};

	_['protected'].GetWeights=async function () {
		let $this=_(this);
		if (!$this.m_weights) {
			$this.m_weights=fetch('https://esm.sh/gh/sb2702/websr/weights/realesrgan/x4v3.bin?raw').then(async function(response) {
				if (!response.ok) throw new Error('Failed to load weights: '+response.status);
				return response.arrayBuffer();
			});
		}
		try { return await $this.m_weights; }
		catch (error) { $this.m_weights=null; throw error; }
	};

	_['public'].Run=async function (args={}, {image}) {
		if (!image) throw new Error('Load an image first.');
		let width=args.width;
		let height=args.height;
		if ((width!==undefined||height!==undefined)&&(!Number.isSafeInteger(width)||width<1||!Number.isSafeInteger(height)||height<1)) {
			throw new Error('Provide positive integer width and height in pixels.');
		}
		let WebSR=await _(this).GetWebSR();
		let source=new Image();
		source.src='data:'+image.mimeType+';base64,'+image.base64;
		await source.decode();
		let buffer=await _(this).GetWeights();
		let canvas=document.createElement('canvas');
		let upscaler;
		let webgl=false;
		let gpu=false;
		try { gpu=await WebSR.initWebGPU(); }
		catch (error) { gpu=false; }
		if (gpu) {
			upscaler=new WebSR({
				network_name: 'realesrgan/x4v3'
				, weights: WebSR.parseBinaryWeights(buffer)
				, gpu
				, canvas
			});
		}
		else {
			let {default: WebSRWebGL}=await import('https://esm.sh/@websr/webgl?standalone');
			let gl=WebSRWebGL.initWebGL(canvas);
			if (!gl||!WebSRWebGL.supportsNetwork('realesrgan/x4v3', gl)) {
				throw new Error('Real-ESRGAN requires WebGPU or a capable WebGL2 device.');
			}
			webgl=true;
			upscaler=new WebSRWebGL({
				network_name: 'realesrgan/x4v3'
				, weights: WebSRWebGL.parseBinaryWeights(buffer)
				, gl
				, canvas
			});
		}
		try {
			await upscaler.render(source);
			let output=document.createElement('canvas');
			output.width=canvas.width;
			output.height=canvas.height;
			let context=output.getContext('2d');
			if (!context) throw new Error('Output canvas is unavailable.');
			if (webgl) {
				let pixels=upscaler.readPixels();
				let result=context.createImageData(output.width, output.height);
				let row=output.width*4;
				for (let y=0; y<output.height; y++) {
					result.data.set(pixels.subarray(y*row, (y+1)*row), (output.height-1-y)*row);
				}
				context.putImageData(result, 0, 0);
			}
			else context.drawImage(canvas, 0, 0);
			if (width&&height&&(width!==output.width||height!==output.height)) {
				let fitted=document.createElement('canvas');
				fitted.width=width;
				fitted.height=height;
				let surface=fitted.getContext('2d');
				if (!surface) throw new Error('Target canvas is unavailable.');
				let scale=Math.min(width/output.width, height/output.height);
				let drawWidth=output.width*scale;
				let drawHeight=output.height*scale;
				surface.imageSmoothingQuality='high';
				surface.drawImage(output, (width-drawWidth)/2, (height-drawHeight)/2, drawWidth, drawHeight);
				output=fitted;
			}
			return {
				message: 'Upscaled to '+output.width+' × '+output.height+' with Real-ESRGAN.'
				, image: {
					base64: output.toDataURL('image/png').split(',')[1]
					, mimeType: 'image/png'
					, title: image.title+' · '+output.width+'×'+output.height
				}
			};
		}
		finally { upscaler.destroy(); }
	};

	_['protected'].m_websr=null;
	_['protected'].m_weights=null;
	Upscale.Default=new Upscale();
	Upscale.Run=Upscale.Default.Run.bind(Upscale.Default);
	Upscale.Run.Description='Upscale the current image with Real-ESRGAN. Optional integer pixel arguments: width and height together for exact output dimensions. The full image is fitted without distortion; a differing aspect ratio leaves transparent margins.';
});
