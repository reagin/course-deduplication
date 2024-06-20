$("#form-login").submit(async function (event) {
	event.preventDefault();
	Swal.showLoading();

	let username = $("#username").val();

	const { data } = await axios.post(this.action, { username });

	if (data.status === 0) {
		message.success(data.message);
		setTimeout(() => {
			history.go(0);
		}, 2000);
	} else {
		message.error(data.message);
	}
});
