var Conversation=Function.extend(Object, function () {
	var _=this(Conversation);
	Conversation=_[Conversation];
	function Conversation() {
		_['base'].apply(this, arguments);
		_(this).m_messages=[];
	}
	_['public'].GetMessages=function () { return _(this).m_messages; };
	_['public'].Add=function (sender, text, fields={}) {
		let message=new Message({
			id: `${sender}_${Date.now()}_${Math.random()}`
			, sender, text
			, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
			, ...fields
		});
		_(this).m_messages=[..._(this).m_messages, message];
		return message;
	};
	_['public'].Clear=function () { _(this).m_messages=[]; };
	_['protected'].m_messages=null;
});
