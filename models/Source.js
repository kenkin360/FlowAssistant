var Source=Function.extend(Object, function () {
	var _=this(Source);
	Source=_[Source];
	function Source(name, value, readyMember, remote=true) {
		_['base'].apply(this, arguments);
		this.Name=name;
		this.Value=value;
		this.ReadyMember=readyMember;
		this.Remote=remote;
	}
	_['public'].Name=null;
	_['public'].Value=null;
	_['public'].ReadyMember=null;
	_['public'].Remote=null;
});
