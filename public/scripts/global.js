const sha256 = plaintext => {
	let hash = CryptoJS.SHA256(plaintext);
	return hash.toString(CryptoJS.enc.Hex);
};

const toast = Swal.mixin({
	toast: true,
	timer: 2000,
	width: "auto",
	position: "center",
	timerProgressBar: false,
	showConfirmButton: false,
	didOpen: toast => {
		toast.addEventListener("mouseenter", Swal.stopTimer);
		toast.addEventListener("mouseleave", Swal.resumeTimer);
	},
});

/**
 * 显示提示信息 (success 或者 error)
 */
const message = {
	error: information => {
		toast.fire({ text: `Error: ${information}` });
	},
	success: information => {
		toast.fire({ text: `Success: ${information}` });
	},
};