var ConversationRenderer=Function.extend(Object, function () {
	var _=this(ConversationRenderer);
	ConversationRenderer=_[ConversationRenderer];

	function ConversationRenderer() {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_root=null;
		$this.m_lastMessages=null;
		$this.m_lastNode=null;
		$this.m_lastConsulting=null;
		$this.m_lastLocale=null;
	}

	_['public'].SetRoot=function (root) { _(this).m_root=root; };
	_['public'].Node=function (role) { return _(this).m_root?.querySelector(`[data-role="${role}"]`); };
	_['public'].GetInput=function () {
		let input=this.Node('input');
		let value=input?.value;
		if (input) input.value='';
		return value;
	};
	_['public'].Submit=function (mediator, attachment) {
		return mediator.Receive('external', this.GetInput(), attachment?.());
	};
	_['public'].HandleClick=function (event, mediator, attachment) {
		let target=event.target.closest?.('[data-control]');
		if (!target||!_(this).m_root?.contains(target)) return;
		if (target.dataset.control==='send') return this.Submit(mediator, attachment);
		if (target.dataset.control==='stop') mediator.Stop();
	};
	_['public'].HandleKeyDown=function (event, mediator, attachment) {
		if (event.target!==this.Node('input')||event.key!=='Enter'||event.shiftKey||event.isComposing) return;
		event.preventDefault();
		return this.Submit(mediator, attachment);
	};
	_['public'].Update=function (messages, consulting, text, url, locale) {
		let root=_(this).m_root;
		if (!root) return;
		new HtmlNode(root.querySelector('[data-control="send"]')).SetText(text('send'));
		let stop=root.querySelector('[data-control="stop"]');
		if (stop) { stop.hidden=!consulting; stop.textContent=text('stop'); }
		let list=this.Node('message-list');
		let $this=_(this);
		if (!list) { $this.m_lastNode=null; return; }
		if (messages===$this.m_lastMessages&&consulting===$this.m_lastConsulting&&list===$this.m_lastNode&&locale===$this.m_lastLocale) return;
		let items=messages.map((message)=>{
			let item=document.createElement('div');
			item.className=`ca-message ca-${message.Sender}`;
			let time=document.createElement('small');
			time.textContent=`${'external'===message.Sender?text('you'):'system'===message.Sender?'System':text('agent')} · ${message.Timestamp?.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})||''}`;
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
				preview.addEventListener(message.Attachment instanceof Media.Video?'loadedmetadata':'load', ()=>{
					let area=list.closest('.ca-messages');
					if (area) area.scrollTop=area.scrollHeight;
				});
				item.appendChild(preview);
			}
			let body=document.createElement('div');
			body.textContent=message.Text;
			item.appendChild(body);
			return item;
		});
		if (consulting&&messages.at(-1)?.Sender==='external') {
			let thinking=document.createElement('div');
			thinking.className='ca-thinking';
			thinking.setAttribute('role', 'status');
			thinking.setAttribute('aria-live', 'polite');
			thinking.textContent=text('thinking');
			items.push(thinking);
		}
		list.replaceChildren(...items);
		$this.m_lastMessages=messages;
		$this.m_lastNode=list;
		$this.m_lastConsulting=consulting;
		$this.m_lastLocale=locale;
		let area=list.closest('.ca-messages');
		if (area) area.scrollTop=area.scrollHeight;
	};

	_['protected'].m_root=null;
	_['protected'].m_lastMessages=null;
	_['protected'].m_lastNode=null;
	_['protected'].m_lastConsulting=null;
	_['protected'].m_lastLocale=null;
});
