var Conversation=Function.extend(Object, function () {
	var _=this(Conversation);
	Conversation=_[Conversation];
	function Conversation() {
		_['base'].apply(this, arguments);
		_(this).m_messages=[];
	}
	_['public'].GetMessages=function () { return _(this).m_messages; };
	_['public'].Add=function (sender, text, attachment) {
		let message=new Message(`${sender}_${Date.now()}_${Math.random()}`, sender, text,
			new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), attachment);
		_(this).m_messages=[..._(this).m_messages, message];
		return message;
	};
	_['public'].Clear=function () { _(this).m_messages=[]; return '對話已清空。'; };
	_['protected'].m_messages=null;
});
