var MediaRenderer=Function.extend(Object, function () {
	var _=this(MediaRenderer);
	MediaRenderer=_[MediaRenderer];

	function MediaRenderer() {
		_['base'].apply(this, arguments);
		_(this).m_root=null;
		_(this).m_lastHistory=null;
		_(this).m_lastHistoryNode=null;
	}

	_['public'].SetRoot=function (root) { _(this).m_root=root; };
	_['public'].Node=function (role) { return _(this).m_root?.querySelector(`[data-role="${role}"]`); };
	_['public'].GetRatio=function () {
		return this.Node('ratios')?.querySelector('.ca-selected')?.dataset.ratio||'original';
	};
	_['public'].GetPrompt=function () { return this.Node('pending-prompt')?.textContent||''; };
	_['public'].SetRatio=function (ratio) {
		let buttons=this.Node('ratios')?.querySelectorAll('[data-ratio]')||[];
		if (![...buttons].some((button)=>button.dataset.ratio===ratio)) return;
		for (let button of buttons) button.classList.toggle('ca-selected', button.dataset.ratio===ratio);
	};
	_['public'].Dispose=function () {
		let video=this.Node('video');
		if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
		_(this).m_root=null;
	};
	_['public'].HandleClick=async function (event, imageService, videoService) {
		let target=event.target.closest?.('[data-control],[data-ratio]');
		if (!target||!_(this).m_root?.contains(target)) return;
		let workspace=imageService.GetWorkspace();
		if (target.dataset.ratio) { this.SetRatio(target.dataset.ratio); return; }
		switch (target.dataset.control) {
			case 'select': await imageService.SelectCurrent(); break;
			case 'camera': await imageService.CaptureCurrent(); break;
			case 'download':
				if (workspace.GetActiveMedia() instanceof Media.Video) await videoService.DownloadCurrent();
				else await imageService.DownloadCurrent();
				break;
			case 'generate': await imageService.GenerateCurrent(new ImageGenerationRequest(this.GetPrompt(), this.GetRatio(), workspace.GetActiveMedia() instanceof Media.Image)); break;
			case 'copy-prompt': await navigator.clipboard.writeText(this.GetPrompt()); break;
		}
	};
	_['public'].Update=function (workspace, generating, text, select, url) {
		if (!_(this).m_root) return;
		let node=(role)=>new HtmlNode(this.Node(role));
		let picture=node('image');
		let video=node('video');
		let image=picture.GetElement();
		let movie=video.GetElement();
		let selected=workspace.GetActiveMedia();
		let showImage=selected instanceof Media.Image&&!!selected.Data;
		let showVideo=selected instanceof Media.Video&&!!selected.Data;
		if (showImage&&image) {
			let source=url(selected);
			if (image.src!==source) picture.SetSource(source);
		}
		else if (image?.getAttribute('src')) image.removeAttribute('src');
		picture.Show(showImage);
		if (showVideo&&movie) {
			let source=url(selected);
			if (movie.src!==source) movie.src=source;
		}
		else if (movie?.getAttribute('src')) {
			movie.pause();
			movie.removeAttribute('src');
			movie.load();
		}
		video.Show(showVideo);
		node('empty').SetStyle('display', showImage||showVideo?'none':'block');
		node('image-ratio').SetText(showImage&&selected.Width&&selected.Height?`${selected.Width} × ${selected.Height}`:showVideo?`${selected.DurationSeconds||'?'} s`:'');
		node('generating').SetStyle('display', generating?'flex':'none');
		node('pending-count').SetText(text('promptDraft'));
		node('pending-list').SetStyle('display', 'none');
		if (!this.Node('ratios')?.querySelector('.ca-selected')) this.SetRatio('original');
		let history=this.Node('history');
		let $this=_(this);
		if (history&&(workspace.History!==$this.m_lastHistory||history!==$this.m_lastHistoryNode)) {
			history.replaceChildren(...workspace.History.map((media)=>{
				let button=document.createElement('button');
				button.dataset.version=media.Id;
				button.title=media.Title||'Media';
				button.onclick=()=>select(media.Id);
				let thumbnail=media instanceof Media.Image||media instanceof Media.Video?document.createElement(media instanceof Media.Video?'video':'img'):null;
				if (media instanceof Media.Video) {
					thumbnail.muted=true;
					thumbnail.playsInline=true;
					thumbnail.preload='metadata';
					thumbnail.onloadedmetadata=()=>{ if (thumbnail.duration>0.1) thumbnail.currentTime=0.1; };
				}
				if (thumbnail) {
					thumbnail.src=url(media);
					if (media instanceof Media.Image) thumbnail.alt=media.Title||'Media';
					button.appendChild(thumbnail);
				}
				else button.textContent=media.MimeType;
				return button;
			}));
			$this.m_lastHistory=workspace.History;
			$this.m_lastHistoryNode=history;
		}
		if (history) for (let button of history.children) button.classList.toggle('ca-selected', button.dataset.version===selected?.Id);
		node('history-count').SetText(workspace.History.length);
	};

	_['protected'].m_root=null;
	_['protected'].m_lastHistory=null;
	_['protected'].m_lastHistoryNode=null;
});
