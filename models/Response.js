var Response=Function.extend(Object, function () {
	var _=this(Response);
	Response=_[Response];

	function Response(reply, attachment, suggestedPrompt, aspectRatio) {
		_['base'].apply(this, arguments);
		this.Reply=reply??'';
		this.Attachment=attachment??null;
		this.SuggestedPrompt=suggestedPrompt??null;
		this.AspectRatio=aspectRatio??null;
	}

	_['public'].Reply='';
	_['public'].Attachment=null;
	_['public'].SuggestedPrompt=null;
	_['public'].AspectRatio=null;
});
