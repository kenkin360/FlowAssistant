var DrawRectangle=Function.extend(Object, function () {
	var _=this(DrawRectangle);
	DrawRectangle=_[DrawRectangle];

	function DrawRectangle() {
		_['base'].apply(this, arguments);
	}

	_['protected'].Validate=function (value) {
		if (!value||typeof value!=='object') throw new Error('Rectangle arguments are missing.');
		let fraction=(number)=>typeof number==='number'&&Number.isFinite(number)&&number>=0&&number<=1;
		let color=(text)=>typeof text==='string'&&/^#[\da-fA-F]{6}$/.test(text);
		if (!fraction(value.x)||!fraction(value.y)||!fraction(value.width)||!fraction(value.height)||
			!value.width||!value.height||value.x+value.width>1||value.y+value.height>1||
			!color(value.stroke)||typeof value.strokeWidth!=='number'||!Number.isFinite(value.strokeWidth)||
			value.strokeWidth<1||value.strokeWidth>100||(value.fill!=null&&!color(value.fill))) {
			throw new Error('Invalid rectangle position, size, or color.');
		}
		return value;
	};

	_['public'].Run=async function (value, context) {
		let image=context.image;
		if (!image) throw new Error('Load an image before drawing a rectangle.');
		let args=_(this).Validate(value);
		let source=new Image();
		source.src=`data:${image.mimeType};base64,${image.base64}`;
		await source.decode();
		let canvas=document.createElement('canvas');
		canvas.width=source.naturalWidth;
		canvas.height=source.naturalHeight;
		let output=canvas.getContext('2d');
		if (!output) throw new Error('The drawing canvas is unavailable.');
		output.drawImage(source, 0, 0);
		output.lineWidth=args.strokeWidth;
		output.strokeStyle=args.stroke;
		if (args.fill) {
			output.fillStyle=args.fill;
			output.fillRect(args.x*canvas.width, args.y*canvas.height, args.width*canvas.width, args.height*canvas.height);
		}
		output.strokeRect(args.x*canvas.width, args.y*canvas.height, args.width*canvas.width, args.height*canvas.height);
		return {message: 'Rectangle drawn on the current image.', image: {
			base64: canvas.toDataURL('image/png').split(',')[1]
			, mimeType: 'image/png'
			, title: image.title+' · Rectangle'
		}};
	};

	DrawRectangle.Default=new DrawRectangle();
	DrawRectangle.Run=DrawRectangle.Default.Run.bind(DrawRectangle.Default);
	DrawRectangle.Run.Description='Draw a rectangle on the current image. Arguments: normalized x, y, width, height (0–1), stroke (#RRGGBB), strokeWidth (pixels), optional fill (#RRGGBB).';
});
