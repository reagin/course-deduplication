$("#logout").click(async function () {
	const { data } = await axios.post("/logout");

	if (data.status === 0) {
		message.success(data.message);
		setTimeout(() => {
			history.go(0);
		}, 2000);
	} else {
		message.error(data.message);
	}
});

$("#unregister").click(async function () {
	const { data } = await axios.post("/unregister");

	if (data.status === 0) {
		message.success(data.message);
		setTimeout(() => {
			history.go(0);
		}, 2000);
	} else {
		message.error(data.message);
	}
});

$("#upload-file").click(async function () {
	const file = $("#input-file").prop('files')[0];
	const fileData = new FormData();

  if (!file) return message.error("Please select a file first");
  
	fileData.append("upload", file);

	try {
	  const { data } = await axios.post("/upload", fileData, {
	    headers: {
	      "Content-Type": "multipart/form-data"
	    }
	  });

	  if (data.status === 0) {
	    message.success(data.message);
	    setTimeout(() => {
	      history.go(0);
	    }, 2000);
	  } else {
	    message.error(data.message);
	  }
	} catch (error) {
	  message.error("An error occurred while uploading the file.");
	}
});

$(".deletefile").click(async function () {
	const fileName = $(this).parent().find(".filename").text();
	const { data } = await axios.post("/delete", { fileName });

	if (data.status === 0) {
		message.success(data.message);
		setTimeout(() => {
			history.go(0);
		}, 2000);
	} else {
		message.error(data.message);
	}
});
