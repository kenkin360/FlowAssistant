var Assistant=Function.extend(Object, function () {
	var _=this(Assistant);
	Assistant=_[Assistant];
	function Assistant(language) {
		_['base'].apply(this, arguments);
		_(this).m_language=/^zh\b/i.test(language||'')?'zh':'en';
		_(this).m_activeTurn=null;
		_(this).m_ready=Promise.resolve();
	}
	_['public'].SetLanguage=function (language) { _(this).m_language=/^zh\b/i.test(language||'')?'zh':'en'; };
	_['public'].SetReady=function (ready) { _(this).m_ready=ready; };
	_['public'].WaitReady=function () { return _(this).m_ready; };
	_['public'].IsConsulting=function () { return !!_(this).m_activeTurn; };
	_['public'].StartTurn=function () {
		if (this.IsConsulting()) return null;
		return _(this).m_activeTurn=new AbortController();
	};
	_['public'].Stop=function () {
		let $this=_(this);
		$this.m_activeTurn?.abort();
		$this.m_activeTurn=null;
	};
	_['public'].CompleteTurn=function (turn) {
		if (_(this).m_activeTurn!==turn) return false;
		_(this).m_activeTurn=null;
		return true;
	};
	_['public'].ReadResponse=function (value, allowAction=true) {
		let raw=String(value??'');
		let fallback=()=>{
			let label='zh'===_(this).m_language?'回應格式不正確，未執行任何動作。原始回應：\n':'Invalid response format; no action was performed. Original response:\n';
			return {reply: label+raw, attemptPlan: [], localAction: null, source: null, Type: null, Valid: false};
		};
		let match=raw.match(/^\s*(\{[\s\S]*\})\s*$/);
		if (!match) {
			match=raw.match(/^\s*```json\s*\n\s*(\{[\s\S]*\})\s*\n```\s*$/i);
		}
		if (!match) {
			return fallback();
		}

		let valueObject=null;
		try {
			valueObject=JSON.parse(match[1]);
		}
		catch (error) {
			return fallback();
		}
		if (!valueObject||'object'!==typeof valueObject||Array.isArray(valueObject)) {
			return fallback();
		}

		let data=Object.assign({
			reply: ''
			, attemptPlan: []
			, localAction: null
			, source: null
			, sourceType: null
		}, valueObject);
		if ('string'!==typeof data.reply
			||!Array.isArray(data.attemptPlan)||!data.attemptPlan.every((item)=>item&&'object'===typeof item&&!Array.isArray(item)&&'string'===typeof item.action)
			||null!==data.localAction&&(false===allowAction||'object'!==typeof data.localAction||Array.isArray(data.localAction)||'string'!==typeof data.localAction.name||!data.localAction.name||!data.localAction.arguments||'object'!==typeof data.localAction.arguments||Array.isArray(data.localAction.arguments))
			||null!==data.source&&'string'!==typeof data.source
			||null!==data.sourceType&&'string'!==typeof data.sourceType
			||!data.reply.trim()&&!data.localAction) {
			return fallback();
		}

		let Type=null;
		if (data.localAction&&!data.attemptPlan.some((item)=>item.action===data.localAction.name)) {
			return fallback();
		}
		if ('loadModule'===data.localAction?.name) {
			if (!data.source||!['javascript', 'js', 'text', 'url'].includes(data.sourceType)) {
				return fallback();
			}
			Type='javascript'===data.sourceType||'js'===data.sourceType?Resource.Inline:Resource.Module;
		}
		else if (null!==data.source||null!==data.sourceType) {
			return fallback();
		}
		return {...data, Type, Valid: true};
	};

	_['public'].RequestResponse=async function (prompt, options, allowAction=false) {
		let response=await Flow.generate.text(prompt, options);
		return this.ReadResponse(response?.text, allowAction);
	};

	_['public'].Process=async function (message, turn, tools) {
		await this.WaitReady();
		if (turn?.signal.aborted) return;
		let plan=[];
		let reports=[];
		let responses=[];
		let artifact=null;
		let answer='';
		for (;;) {
			if (turn?.signal.aborted) return;
			let request=await tools.GetRequest(message, reports, plan);
			let response=await this.RequestResponse(request.Prompt, request.Options, true);
			if (turn?.signal.aborted) return;
			answer=response.reply;
			if (response.Valid) {
				responses.push(response);
				if (response.attemptPlan.length) plan=response.attemptPlan;
			}
			let action=response.localAction;
			if (!action) break;
			if (!plan.some((item)=>item.action===action.name)) {
				reports.push({action: action.name, status: 'error', result: 'The action needs an attemptPlan entry before execution.'});
				continue;
			}
			try {
				let result=await tools.RunRequestedAction(action, response, turn);
				if (turn?.signal.aborted) return;
				if (result.conversationReset) return;
				if (result.artifact) artifact=result.artifact;
				reports.push({action: action.name, status: 'success', result: result.message,
					...(result.artifact?{artifact: tools.DescribeResult(result)}:{})});
			}
			catch (error) {
				reports.push({action: action.name, status: 'error', result: error instanceof Error?error.message:String(error)});
			}
		}
		if (!answer) {
			let summary=await tools.GetSummaryRequest(message, reports);
			let response=await this.RequestResponse(summary.Prompt, summary.Options);
			if (turn?.signal.aborted) return;
			answer=response.reply;
		}
		if (!answer) answer=this.ReadResponse('', false).reply;
		if (turn?.signal.aborted) return;
		tools.CompleteResponse(answer, responses, artifact);
	};

	_['protected'].m_language=null;
	_['protected'].m_activeTurn=null;
	_['protected'].m_ready=null;
});
