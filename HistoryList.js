var HistoryList=Function.extend(Object, function () {
	var _=this(HistoryList);
	HistoryList=_[HistoryList];
	function HistoryList() {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_lastHistory=null;
		$this.m_lastNode=null;
	}
	_['public'].Update=function (area, state, select, url) {
		let $this=_(this);
		if (!area) { $this.m_lastNode=null; return; }
		if (state.History!==$this.m_lastHistory||area!==$this.m_lastNode) {
			area.replaceChildren(...state.History.map((media)=>{
				let button=document.createElement('button');
				button.dataset.version=media.Id;
				button.title=state.Labels.get(media.Id)||'Media';
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
					if (media instanceof Media.Image) thumbnail.alt=state.Labels.get(media.Id)||'Media';
					button.appendChild(thumbnail);
				}
				else button.textContent=media.MimeType;
				return button;
			}));
			$this.m_lastHistory=state.History;
			$this.m_lastNode=area;
		}
		for (let button of area.children) button.classList.toggle('ca-selected', button.dataset.version===state.ActiveMedia?.Id);
	};
	_['private'].m_lastHistory=null;
	_['private'].m_lastNode=null;
});
