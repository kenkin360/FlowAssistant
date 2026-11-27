var Agent=Function.extend(Object, function () {
	var _=this(Agent);
	Agent=_[Agent];
	function Agent(sourceUrl) {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_conversation=new Conversation();
		$this.m_listeners=new Set();
		$this.m_assistant=new Assistant();
		$this.m_actions=new AppActions(sourceUrl, (event, details, attachment)=>this.NotifyAssistant(event, details, attachment), ()=>this.Notify());
	}
	_['public'].GetActions=function () { return _(this).m_actions; };
	_['public'].GetMessages=function () { return _(this).m_conversation.GetMessages(); };
	_['public'].SetReady=function (ready) { _(this).m_assistant.SetReady(ready); };
	_['public'].IsConsulting=function () { return _(this).m_assistant.IsConsulting(); };
	_['protected'].AddMessage=function (sender, text, fields={}) {
		let $this=_(this);
		$this.m_conversation.Add(sender, text, fields);
		$this.Notify();
	};

	_['public'].Reply=function (text, fields={}) {
		_(this).AddMessage('agent', text, fields);
	};

	_['public'].ReportError=function (error) {
		_(this).AddMessage('system', error.message||String(error));
	};

	_['public'].NotifyAssistant=async function (event, details, attachment) {
		try { await _(this).Report(event, details, attachment); }
		catch (error) { this.ReportError(error); }
	};

	_['public'].Subscribe=function (listener) {
		let $this=_(this);
		$this.m_listeners.add(listener);
		listener();
		return ()=>$this.m_listeners.delete(listener);
	};

	_['public'].Notify=function () {
		for (let listener of _(this).m_listeners) {
			try { listener(); }
			catch (error) { console.error('App subscriber failed:', error); }
		}
	};

	_['public'].Stop=function () {
		let $this=_(this);
		if (!$this.m_assistant.IsConsulting()) return;
		$this.m_assistant.Stop();
		$this.Notify();
	};
	_['public'].Send=async function (text) {
		let $this=_(this);
		let message=String(text??'').trim();
		if (!message||$this.IsConsulting()) return;
		let turn=$this.m_assistant.StartTurn();
		$this.AddMessage('user', message);
		try {
			await $this.m_assistant.Process(message, turn, this);
		}
		catch (error) { if (!turn.signal.aborted) await this.NotifyAssistant('Conversation failed', {Error: error.message||String(error)}); }
		finally {
			if ($this.m_assistant.CompleteTurn(turn)) {
				$this.Notify();
			}
		}
	};

	_['public'].Welcome=async function (language) {
		let $this=_(this);
		let setupError='';
		let runtime={message: ''};
		try { await $this.m_actions.Initialize(); }
		catch (error) { setupError=error.message||String(error); }
		try { runtime=await $this.m_actions.InspectRuntime({}); }
		catch (error) { setupError=[setupError, error.message||String(error)].filter(Boolean).join('; '); }
		try {
			let response=await $this.m_assistant.Welcome(language, runtime.message, setupError);
			if (!this.GetMessages().length) this.Reply(response.reply);
		}
		catch (error) { this.ReportError(error); }
	};
	_['public'].GetRequest=async function (message, reports, plan) {
		let $this=_(this);
		let runtime=await $this.m_actions.InspectRuntime({});
		let instruction=$this.m_assistant.GetInstruction(runtime.message, $this.m_actions.GetInstruction());
		return $this.m_actions.GetRequest(message, reports, plan, this.GetMessages(), instruction);
	};
	_['public'].GetSummaryRequest=async function (message, reports) {
		let request=await this.GetRequest(message, reports, []);
		return {Prompt: `${request.Prompt}\nSummarize these results and answer the user in natural language.`, Options: request.Options};
	};

	_['public'].RunRequestedAction=async function (action, response, turn) {
		let $this=_(this);
		if (action.name==='resetConversation') {
			$this.m_conversation.Clear();
			this.Notify();
			let answer=await $this.m_assistant.RequestResponse('對話已清空，請簡短回覆使用者。', {systemInstruction: $this.m_assistant.GetInstruction('', '')});
			if (!turn?.signal.aborted) this.Reply(answer.reply);
			return {message: 'Conversation cleared.', conversationReset: true};
		}
		return $this.m_actions.RunRequestedAction(action, response, turn);
	};
	_['public'].CompleteResponse=function (answer, responses, artifact) {
		let fields=_(this).m_actions.CompleteResponse(answer, responses, artifact);
		this.Reply(answer, fields);
	};
	_['protected'].Report=async function (event, details={}, attachment) {
		let $this=_(this);
		await $this.m_assistant.WaitReady();
		let response=await $this.m_assistant.Report(event, details, this.GetMessages());
		this.Reply(response.reply, attachment?{attachment: $this.m_actions.NormalizeAttachment(attachment)}:{});
	};
	_['public'].DescribeResult=function (result) { return _(this).m_actions.DescribeResult(result); };
	_['protected'].m_conversation=null;
	_['protected'].m_listeners=null;
	_['protected'].m_assistant=null;
	_['protected'].m_actions=null;
});
