var Binding=Function.extend(Object, function () {
	var _=this(Binding);
	Binding=_[Binding];
	function Binding(target, name) {
		_['base'].apply(this, arguments);
		this.Value=target[name];
	}
	Binding.Capture=function (target, name) {
		if (!Object.prototype.hasOwnProperty.call(target, name)) return null;
		return new Binding(target, name);
	};
	_['public'].Restore=function (target, name) {
		target[name]=this.Value;
	};
	_['public'].Value=null;
});
