var ConversationMediator=Function.extend(Object, function () {
	var _=this(ConversationMediator);
	ConversationMediator=_[ConversationMediator];

	function ConversationMediator() {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_conversation=new Conversation();
		$this.m_assistants=new Set();
		$this.m_listeners=new Set();
		$this.m_turns=new Map();
		$this.m_waiting=new Map();
		$this.m_ready=null;
	}

	_['public'].AddAssistant=function (assistant) {
		_(this).m_assistants.add(assistant);
		assistant.GetMethods().Conversation=_(this).m_conversation;
	};
	_['public'].GetAssistant=function () { return _(this).m_assistants.values().next().value; };
	_['public'].GetMessages=function () { return _(this).m_conversation.GetMessages(); };
	_['public'].IsConsulting=function () { return _(this).m_turns.size>0; };
	_['public'].Subscribe=function (listener) {
		let $this=_(this);
		$this.m_listeners.add(listener);
		try { listener(); }
		catch (error) { console.error('Subscriber failed:', error); }
		return ()=>$this.m_listeners.delete(listener);
	};
	_['protected'].Notify=function () {
		for (let listener of _(this).m_listeners) {
			try { listener(); }
			catch (error) { console.error('Subscriber failed:', error); }
		}
	};
	_['public'].Publish=function (sender, text, attachment) {
		let message=_(this).m_conversation.Add(sender, text, attachment);
		_(this).Notify();
		return message;
	};
	_['public'].ReportError=function (error) {
		try { this.Publish('system', error?.message||String(error)); }
		catch (reportError) { console.error('Unable to record failure:', reportError); }
	};
	_['public'].Stop=function (assistant) {
		let turns=_(this).m_turns;
		if (assistant) {
			for (let turn of turns.get(assistant)||[]) turn.abort();
			turns.delete(assistant);
			_(this).m_waiting.delete(assistant);
		}
		else {
			for (let pending of turns.values()) for (let turn of pending) turn.abort();
			turns.clear();
			_(this).m_waiting.clear();
		}
		_(this).Notify();
	};
	_['public'].Receive=function (sender, value, attachment, assistant) {
		let $this=_(this);
		let message=String(value??'').trim();
		let recipient=assistant||this.GetAssistant();
		if (!message||!recipient) return Promise.resolve();
		let turn=new AbortController();
		let turns=$this.m_turns.get(recipient);
		if (!turns) { turns=new Set(); $this.m_turns.set(recipient, turns); }
		turns.add(turn);
		let received=this.Publish(sender, message, attachment);
		let previous=$this.m_waiting.get(recipient)||Promise.resolve();
		let work=previous.then(async ()=>{
			await $this.m_ready;
			if (turn.signal.aborted) return;
			let history=this.GetMessages();
			let index=history.indexOf(received);
			let messages=index<0?history:history.filter((entry, position)=>position<=index||entry.Sender==='assistant'||entry.Sender==='system');
			await recipient.Process(received, messages, turn, (response, resultAttachment)=>this.Publish('assistant', response.Reply, resultAttachment));
		}).catch((error)=>{
			if (!turn.signal.aborted) {
				console.error('Conversation failed:', error);
				this.ReportError(error);
			}
		}).finally(()=>{
			turns.delete(turn);
			if (!turns.size&&$this.m_turns.get(recipient)===turns) $this.m_turns.delete(recipient);
			if ($this.m_waiting.get(recipient)===work) $this.m_waiting.delete(recipient);
			$this.Notify();
		});
		$this.m_waiting.set(recipient, work);
		return work;
	};
	_['public'].Start=function (language) {
		let $this=_(this);
		if (!$this.m_ready) $this.m_ready=$this.Initialize(language);
		return $this.m_ready;
	};
	_['protected'].Initialize=async function (language) {
		let assistant=this.GetAssistant();
		let methods=assistant.GetMethods();
		let setupError='';
		try { await methods.Modules.Initialize(); }
		catch (error) { console.error('Module startup failed:', error); setupError=error?.message||String(error); }
		try {
			let runtime=methods.Modules.InspectRuntime({});
			let prompt=`
請根據實際檢查結果，作為對話參與者發出第一則訊息。
啟動結果：${setupError||'success'}。
瀏覽器語系：${language||'en'}
`;
			let options={systemInstruction: assistant.GetInstruction(runtime, methods.GetInstruction())};
			let previous=this.GetMessages().length;
			let request=new AssistantRequest(prompt, options);
			await assistant.Consult((completed)=>methods.GetContinuation(request, completed), null,
				(response)=>this.Publish('assistant', response.Reply),
				(response, result)=>{
					if (!previous&&!this.GetMessages().slice(previous).some((entry)=>entry.Sender!=='assistant'&&entry.Sender!=='system')) {
						this.Publish('assistant', response.Reply, methods.GetAttachment(result));
					}
				});
		}
		catch (error) { console.error('Conversation startup failed:', error); this.ReportError(error); }
	};
	_['public'].ReportResult=function (assistant, event, value) {
		Promise.resolve(_(this).m_ready).then(()=>_(this).ProcessNotification(assistant, event, value))
			.catch((error)=>this.ReportError(error));
	};
	_['protected'].ProcessNotification=async function (assistant, event, value) {
		let recent=this.GetMessages().map((entry)=>`${entry.Sender}: ${entry.Text}`).join('\n');
		let prompt=`
最近對話：
${recent}
事件：${event}
實際結果：${JSON.stringify(value)}
請依目前對話語言，根據實際結果回答。
`;
		let methods=assistant.GetMethods();
		let options={systemInstruction: assistant.GetInstruction(methods.Modules.InspectRuntime({}), methods.GetInstruction())};
		let request=new AssistantRequest(prompt, options);
		await assistant.Consult((completed)=>methods.GetContinuation(request, completed), null,
			(response)=>this.Publish('assistant', response.Reply),
			(response, result)=>this.Publish('assistant', response.Reply, methods.GetAttachment(value)||methods.GetAttachment(result)));
	};

	_['protected'].m_conversation=null;
	_['protected'].m_assistants=null;
	_['protected'].m_listeners=null;
	_['protected'].m_turns=null;
	_['protected'].m_waiting=null;
	_['protected'].m_ready=null;
});
