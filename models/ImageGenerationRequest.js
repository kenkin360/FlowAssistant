var ImageGenerationRequest=Function.extend(Request, function () {
	var _=this(ImageGenerationRequest);
	ImageGenerationRequest=_[ImageGenerationRequest];

	function ImageGenerationRequest(prompt, aspectRatio, useCurrentImage) {
		_['base'].call(this, prompt);
		this.AspectRatio=aspectRatio??null;
		this.UseCurrentImage=useCurrentImage===true;
	}

	_['public'].AspectRatio=null;
	_['public'].UseCurrentImage=false;
});
