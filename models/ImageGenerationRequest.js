var ImageGenerationRequest=Function.extend(Object, function () {
	var _=this(ImageGenerationRequest);
	ImageGenerationRequest=_[ImageGenerationRequest];

	function ImageGenerationRequest(prompt, aspectRatio, useCurrentImage) {
		_['base'].apply(this, arguments);
		this.Prompt=prompt??'';
		this.AspectRatio=aspectRatio??null;
		this.UseCurrentImage=useCurrentImage===true;
	}

	_['public'].Prompt='';
	_['public'].AspectRatio=null;
	_['public'].UseCurrentImage=false;
});
