var View=Function.extend(Object, function () {
	var _=this(View);
	View=_[View];
	function View() {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_root=null;
		$this.m_urls=new Map();
		$this.m_mounted=new Map();
		$this.m_messages=new MessageList();
		$this.m_history=new HistoryList();
	}
	_['public'].SetRoot=function (element) { _(this).m_root=element; };
	_['public'].GetRoot=function () { return _(this).m_root; };
	_['protected'].Url=function (media) {
		if (!media?.Data) return '';
		let urls=_(this).m_urls;
		if (!urls.has(media)) urls.set(media, URL.createObjectURL(media.Data));
		return urls.get(media);
	};
	_['public'].Dispose=function () {
		let movie=this.Node('video');
		if (movie) { movie.pause(); movie.removeAttribute('src'); movie.load(); }
		for (let url of _(this).m_urls.values()) URL.revokeObjectURL(url);
		_(this).m_urls.clear();
	};
	_['protected'].Prune=function (media, messages) {
		let used=new Set([...media.History, media.GetCurrentMedia(), ...messages.map((message)=>message.Attachment)]);
		for (let [media, url] of _(this).m_urls) if (!used.has(media)) {
			URL.revokeObjectURL(url);
			_(this).m_urls.delete(media);
		}
	};
	_['public'].GetPrompt=function () { return this.Node('pending-prompt')?.textContent||''; };
	_['protected'].SetPrompt=function (prompt) {
		let value=String(prompt??'');
		new HtmlNode(this.Node('pending-prompt')).SetText(value);
		new HtmlNode(this.Node('pending')).SetStyle('display', value?'block':'none');
	};
	_['public'].GetRatio=function () {
		return this.Node('ratios')?.querySelector('.ca-selected')?.dataset.ratio||'original';
	};
	_['public'].SetRatio=function (ratio) {
		let buttons=this.Node('ratios')?.querySelectorAll('[data-ratio]')||[];
		if (![...buttons].some((button)=>button.dataset.ratio===ratio)) return;
		for (let button of buttons) button.classList.toggle('ca-selected', button.dataset.ratio===ratio);
	};
	_['public'].ApplySuggestions=function (suggestions) {
		if ('string'===typeof suggestions?.SuggestedPrompt) _(this).SetPrompt(suggestions.SuggestedPrompt);
		if ('string'===typeof suggestions?.AspectRatio) this.SetRatio(suggestions.AspectRatio);
	};
	_['public'].GetLocale=function () {
		let locale=navigator.language||'en';
		return /^en(?:-|$)/i.test(locale)?'en':locale;
	};
	_['public'].Node=function (role) { return _(this).m_root?.querySelector(`[data-role="${role}"]`); };
	_['public'].Localize=function (text) {
		let root=_(this).m_root;
		if (!root) return;
		for (let node of root.querySelectorAll('[data-i18n]')) {
			if (Object.prototype.hasOwnProperty.call(DisplayText.Default.Entries, node.dataset.i18n)) node.textContent=text(node.dataset.i18n);
		}
		for (let node of root.querySelectorAll('[data-i18n-placeholder]')) {
			if (Object.prototype.hasOwnProperty.call(DisplayText.Default.Entries, node.dataset.i18nPlaceholder)) node.placeholder=text(node.dataset.i18nPlaceholder);
		}
	};
	_['public'].Mount=function (name, element, slot, slots) {
		if (!name||!(element instanceof HTMLElement)||!slots?.includes(slot)) return false;
		try {
			let target=_(this).m_root?.querySelector(`[data-slot="${slot}"]`);
			if (!target) return false;
			let mounted=_(this).m_mounted;
			let previous=mounted.get(name);
			target.appendChild(element);
			if (previous&&previous!==element) previous.remove();
			mounted.set(name, element);
			return true;
		}
		catch (error) {
			console.error('Unable to mount UI element:', error);
			return false;
		}
	};
	_['public'].Unmount=function (name) {
		let mounted=_(this).m_mounted;
		mounted.get(name)?.remove();
		mounted.delete(name);
	};
	_['public'].Mounted=function () { return [..._(this).m_mounted.keys()]; };
	_['public'].Update=function (media, messages, consulting, generating, text, select) {
		let root=_(this).m_root;
		if (!root) return;
		let node=(role)=>new HtmlNode(this.Node(role));
		let picture=node('image');
		let video=node('video');
		let image=picture.GetElement();
		let movie=video.GetElement();
		let showImage=media.GetActiveMedia() instanceof Media.Image&&!!media.GetActiveMedia().Data;
		let showVideo=media.GetActiveMedia() instanceof Media.Video&&!!media.GetActiveMedia().Data;
		if (showImage&&image) {
			let url=_(this).Url(media.GetActiveMedia());
			if (image.src!==url) picture.SetSource(url);
		}
		else if (image?.getAttribute('src')) image.removeAttribute('src');
		picture.Show(showImage);
		if (showVideo&&movie) {
			let url=_(this).Url(media.GetActiveMedia());
			if (movie.src!==url) movie.src=url;
		}
		else if (movie?.getAttribute('src')) {
			movie.pause();
			movie.removeAttribute('src');
			movie.load();
		}
		video.Show(showVideo);
		node('empty').SetStyle('display', showImage||showVideo?'none':'block');
		node('image-ratio').SetText(showImage&&media.GetActiveMedia().Width&&media.GetActiveMedia().Height?`${media.GetActiveMedia().Width} × ${media.GetActiveMedia().Height}`:showVideo?`${media.GetActiveMedia().DurationSeconds||'?'} s`:'');
		node('generating').SetStyle('display', generating?'flex':'none');
		this.Localize(text);
		new HtmlNode(root.querySelector('[data-action="send"]')).SetText(consulting?text('stop'):text('send'));
		node('pending-count').SetText(text('promptDraft'));
		node('pending-list').SetStyle('display', 'none');
		if (!this.Node('ratios')?.querySelector('.ca-selected')) this.SetRatio('original');
		_(this).m_messages.Update(node('message-list').GetElement(), messages, consulting, text, (value)=>_(this).Url(value));
		_(this).m_history.Update(node('history').GetElement(), media, select, (value)=>_(this).Url(value));
		node('history-count').SetText(media.History.length);
		_(this).Prune(media, messages);
	};
	_['protected'].m_root=null;
	_['protected'].m_urls=null;
	_['protected'].m_mounted=null;
	_['protected'].m_messages=null;
	_['protected'].m_history=null;
});
