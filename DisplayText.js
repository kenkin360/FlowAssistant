var DisplayText=Function.extend(Promise, function () {
	var _=this(DisplayText);
	DisplayText=_[DisplayText];

	function DisplayText(locale) {
		if ('function'===typeof locale) {
			_['base'].call(this, locale);
			return;
		}

		let resolve;
		_['base'].call(this, (done)=>{
			resolve=done;
		})(function () {
			this.Locale=locale;
			this.Entries=DisplayText.Default?.Entries||this.Entries;
			if ('en'===locale) {
				resolve(this.Entries);
				return;
			}

			Flow.generate.text(`
請保持以下字典的所有 key，將每個 value 翻譯為 ${locale} 語系
並只回傳可供 JSON.parse 直接解析的 JSON 物件文字
${JSON.stringify((DisplayText.Default).Entries)}
`).then(response => {
				this.Entries=JSON.parse(response.text);
				resolve(this.Entries);
			}).catch((error)=>{
				console.error(error);
				resolve(this.Entries);
			});
		});
	}

	_['public'].Entries={
		tagline: 'Describe an edit to use local tools, or generate an image'
		, help: 'Help'
		, target: 'Target Media'
		, conversation: 'Conversation'
		, download: 'Download'
		, empty: 'No media selected. Load an image or describe an idea in chat.'
		, media: '＋ Media'
		, generating: 'Generating image…'
		, copyPrompt: 'Copy prompt'
		, generate: 'Generate image'
		, ratio: 'Output ratio'
		, original: 'Original'
		, input: 'Discuss an idea, draw a rectangle, inspect code, or create a local tool…'
		, send: 'Send'
		, stop: 'Stop'
		, close: 'Close'
		, you: 'You'
		, agent: 'Assistant'
		, promptDraft: 'Combined prompt draft: '
		, copy: 'Copy'
		, thinking: 'Thinking and running local operations…'
		, waiting: 'Waiting to start…'
		, stopped: 'Stopped'
	};
	
	_['public'].Locale=null;

	DisplayText.GetInstance=function (locale) {
		let instance=(DisplayText.Instances).find(value => value.Locale===locale);

		if (!instance) {
			instance=new DisplayText(locale);
			DisplayText.Instances.push(instance);
		}

		return instance;
	};

	DisplayText.GetText=function (locale, key) {
		return DisplayText.GetInstance(locale).Entries?.[key]??DisplayText.Default.Entries[key]??key;
	};

	DisplayText.Default=new DisplayText('en');
	DisplayText.Instances=[DisplayText.Default];
});
