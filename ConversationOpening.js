var ConversationOpening=Function.extend(Object, function () {
	var _=this(ConversationOpening);
	ConversationOpening=_[ConversationOpening];

	function ConversationOpening(assistant) {
		_['base'].apply(this, arguments);
		_(this).m_assistant=assistant;
	}

	_['public'].Start=async function (language) {
		let assistant=_(this).m_assistant;
		let methods=assistant.GetMethods();
		let setupError='';
		try { await methods.Modules.Initialize(); }
		catch (error) { setupError=error?.message||String(error); }
		try {
			let runtime=methods.Modules.InspectRuntime({}).message;
			let prompt='請根據實際檢查結果，作為對話參與者發出第一則訊息。啟動結果：'+(setupError||'success')+'。瀏覽器語系：'+(language||'en');
			let response=await assistant.RequestResponse(prompt, {systemInstruction: assistant.GetInstruction(runtime, methods.GetInstruction())});
			if (!assistant.GetMessages().length) assistant.Reply(response.reply);
		}
		catch (error) { assistant.ReportError(error); }
	};

	_['protected'].m_assistant=null;
});
