var Message=Function.extend(Object, function () {
	var _=this(Message);
	Message=_[Message];
	function Message(value={}) {
		_['base'].apply(this, arguments);
		this.Id=value.id;
		this.Sender=value.sender;
		this.Text=value.text;
		this.Timestamp=value.timestamp;
		this.Attachment=value.attachment||null;
	}
	_['public'].toJSON=function () {
		return {id: this.Id, sender: this.Sender, text: this.Text, timestamp: this.Timestamp, attachment: this.Attachment};
	};
	_['public'].Id=null;
	_['public'].Sender=null;
	_['public'].Text=null;
	_['public'].Timestamp=null;
	_['public'].Attachment=null;
});
