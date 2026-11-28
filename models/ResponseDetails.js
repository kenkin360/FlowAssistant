var ResponseDetails=Function.extend(Object, function () {
	var _=this(ResponseDetails);
	ResponseDetails=_[ResponseDetails];

	function ResponseDetails(attachment, suggestedPrompt, aspectRatio) {
		_['base'].apply(this, arguments);
		this.Attachment=attachment??null;
		this.SuggestedPrompt=suggestedPrompt??null;
		this.AspectRatio=aspectRatio??null;
	}

	_['public'].Attachment=null;
	_['public'].SuggestedPrompt=null;
	_['public'].AspectRatio=null;
});
