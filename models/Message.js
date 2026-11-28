var Message=Function.extend(Object, function () {
	var _=this(Message);
	Message=_[Message];
	function Message(id, sender, text, timestamp, attachment) {
		_['base'].apply(this, arguments);
		this.Id=id??null;
		this.Sender=sender??'';
		this.Text=text??'';
		this.Timestamp=timestamp??'';
		this.Attachment=attachment??null;
	}
	_['public'].toJSON=function () {
		return {id: this.Id, sender: this.Sender, text: this.Text, timestamp: this.Timestamp, attachment: this.Attachment};
	};
	_['public'].Id=null;
	_['public'].Sender='';
	_['public'].Text='';
	_['public'].Timestamp='';
	_['public'].Attachment=null;
});
