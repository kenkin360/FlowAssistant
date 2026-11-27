var MessageList=Function.extend(Object, function () {
	var _=this(MessageList);
	MessageList=_[MessageList];
	function MessageList() {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_lastMessages=null;
		$this.m_lastNode=null;
		$this.m_lastConsulting=null;
	}
	_['public'].Update=function (list, messages, consulting, text, url) {
		let $this=_(this);
		if (!list) { $this.m_lastNode=null; return; }
		if (messages===$this.m_lastMessages&&consulting===$this.m_lastConsulting&&list===$this.m_lastNode) return;
		let items=messages.map((message)=>{
			let item=document.createElement('div');
			item.className=`ca-message ca-${message.Sender}`;
			let time=document.createElement('small');
			time.textContent=('user'===message.Sender?text('you'):'system'===message.Sender?'App':text('agent'))+' · '+message.Timestamp;
			item.appendChild(time);
			if (message.Attachment instanceof Media.Image||message.Attachment instanceof Media.Video) {
				let preview=document.createElement(message.Attachment instanceof Media.Video?'video':'img');
				if (message.Attachment instanceof Media.Video) {
					preview.controls=true;
					preview.playsInline=true;
					preview.preload='metadata';
				}
				preview.src=url(message.Attachment);
				if (message.Attachment instanceof Media.Image) preview.alt='Media result';
				item.appendChild(preview);
			}
			let body=document.createElement('div');
			body.textContent=message.Text;
			item.appendChild(body);
			return item;
		});
		let pendingIndex=consulting?messages.findLastIndex((message)=>'user'===message.Sender):-1;
		if (pendingIndex>=0) {
			let thinking=document.createElement('div');
			thinking.className='ca-thinking';
			thinking.setAttribute('role', 'status');
			thinking.setAttribute('aria-live', 'polite');
			thinking.textContent=text('thinking');
			items.splice(pendingIndex+1, 0, thinking);
		}
		list.replaceChildren(...items);
		$this.m_lastMessages=messages;
		$this.m_lastNode=list;
		$this.m_lastConsulting=consulting;
		(list.querySelector('.ca-thinking')||list.lastElementChild)?.scrollIntoView({block: 'nearest'});
	};
	_['protected'].m_lastMessages=null;
	_['protected'].m_lastNode=null;
	_['protected'].m_lastConsulting=null;
});
