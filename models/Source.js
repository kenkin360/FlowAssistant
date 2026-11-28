var Source=Function.extend(Object, function () {
	var _=this(Source);
	Source=_[Source];
	function Source(name, value, readyMember, remote) {
		_['base'].apply(this, arguments);
		this.Name=name??'';
		this.Value=value??'';
		this.ReadyMember=readyMember??null;
		this.Remote=remote===true;
	}
	_['public'].toJSON=function () {
		return {name: this.Name, url: this.Value, readyMember: this.ReadyMember};
	};
	_['public'].Name='';
	_['public'].Value='';
	_['public'].ReadyMember=null;
	_['public'].Remote=false;
});
