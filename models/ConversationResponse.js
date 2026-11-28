var ConversationResponse=Function.extend(Response, function () {
	var _=this(ConversationResponse);
	ConversationResponse=_[ConversationResponse];

	function ConversationResponse(reply, attachment) {
		_['base'].call(this, reply);
		this.Attachment=attachment??null;
	}

	_['public'].Attachment=null;
});
