import { JsonDB, Config } from "node-json-db";
import session from "express-session";
import express from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";

// Other methods
function sha256(input) {
	const hash = crypto.createHash("sha256");
	hash.update(input);
	return hash.digest("hex");
}

// Database methods
const database = new JsonDB(
	new Config(path.resolve(import.meta.dirname, "../userinfo.db"), true, true, "/")
);
// Create Json Path
await database.push(`/userinfo/userlist`, [], false);
const userinfo = {
	/**
	 * 返回引用数目为 0 的 section 名称数组
	 * @returns Array
	 */
	getempty: async function () {
		let result = [];

		try {
			const sections = await database.getObjectDefault("/sections", {});

			for (const key in sections) {
				if (sections[key] === 0) {
					result.push(key);
				}
			}
		} catch (error) {
			return [];
		}
		return result;
	},
	/**
	 * 增添用户至用户列表，并添加用户组
	 * @param {string} username
	 * @returns boolean
	 */
	adduser: async function (username) {
		try {
			const index = await database.getIndexValue(
				`/userinfo/userlist`,
				username
			);

			if (index >= 0) throw new Error("User Already Exists");

			await database.push("/userinfo/userlist", [username], false);
			await database.push(`/userinfo/${username}`, { filelist: [] });
		} catch (error) {
			return false;
		}
		return true;
	},
	/**
	 * 删除用户文件对应 section 的引用数目，用户组，以及用户列表中的用户
	 * @param {string} username
	 * @returns boolean
	 */
	deluser: async function (username) {
		try {
			const index = await database.getIndexValue(
				"/userinfo/userlist",
				username
			);
			const filelist = await database.getObject(
				`/userinfo/${username}/filelist`
			);

			for (const filename of filelist) {
				await this.removefile(username, filename);
			}

			await database.delete(`/userinfo/${username}`);
			await database.delete(`/userinfo/userlist[${index}]`);
		} catch (error) {
			return false;
		}
		return true;
	},
	/**
	 * 返回用户文件名称和对应 section 名称数组的键值对
	 * @param {string} username
	 * @returns {object} Object
	 */
	getfiles: async function (username) {
		let result = {};

		try {
			const filelist = await database.getObjectDefault(
				`/userinfo/${username}/filelist`,
				[]
			);

			for (const filename of filelist) {
				const sectionArr = await database.getObjectDefault(
					`/userinfo/${username}/${filename}`,
					[]
				);
				result[filename] = sectionArr;
			}
		} catch (error) {
			return {};
		}
		return result;
	},
	/**
	 * 向 username 用户增添文件 filename，并添加对应的 section 数组以及更新 section 引用数目
	 * @param {string} username
	 * @param {string} filename
	 * @param {object} sections
	 * @returns boolean
	 */
	uploadfile: async function (username, filename, sections) {
		try {
			const index = await database.getIndexValue(
				`/userinfo/${username}/filelist`,
				filename
			);

			if (index >= 0) throw new Error("File Already Exists");

			await database.push(`/userinfo/${username}/filelist`, [filename], false);
			await database.push(`/userinfo/${username}/${filename}`, sections);

			for (const section of sections) {
				const oldValue = await database.getObjectDefault(
					`/sections/${section}`,
					0
				);

				await database.push(`/sections/${section}`, oldValue + 1);
			}
		} catch (error) {
			return false;
		}
		return true;
	},
	/**
	 * 移除 username 用户的文件 filename，并减少对应 section 引用数目
	 * @param {string} username
	 * @param {string} filename
	 * @returns boolean
	 */
	removefile: async function (username, filename) {
		try {
			const index = await database.getIndexValue(
				`/userinfo/${username}/filelist`,
				filename
			);
			const sections = await database.getObjectDefault(
				`/userinfo/${username}/${filename}`,
				[]
			);

			console.log(sections);

			if (index === -1) throw new Error("File Not Exist");

			for (const section of sections) {
				const oldValue = await database.getObjectDefault(
					`/sections/${section}`,
					0
				);

				if (oldValue !== 0) {
					await database.push(`/sections/${section}`, oldValue - 1);
				}
			}

			await database.delete(`/userinfo/${username}/${filename}`);
			await database.delete(`/userinfo/${username}/filelist[${index}]`);
		} catch (error) {
			return false;
		}
		return true;
	},
};

// Local file methods
const seqlength = 16; // length of folder's name

function getFolderPath(hashes) {
	const regex = new RegExp(`.{1,${seqlength}}`, "g");
	// Fill the end with '0' to ensure
	// that the string length is an integer multiple of seqlength
	const paddedStr = hashes.padEnd(
		Math.ceil(hashes.length / seqlength) * seqlength,
		"0"
	);
	return `/${paddedStr.match(regex)?.join("/")}`;
}

function createDirectoryRecursive(hashes) {
	const directoryPath = getFolderPath(hashes);
	const directories = directoryPath.split("/");
	let currentPath = path.resolve(import.meta.dirname, "../storage");

	for (const directory of directories) {
		currentPath += directory + "\\";
		if (!fs.existsSync(currentPath)) {
			fs.mkdirSync(currentPath);
		}
	}
}

function deleteEmptyDirectoriesRecursive(hashes) {
	console.log({ hashes });

	const filePath = `../storage/${getFolderPath(hashes)}`;
	const directoryPath = path.resolve(import.meta.dirname, filePath);

	console.log(directoryPath);

	if (!hashes) return;
	if (!fs.existsSync(directoryPath)) return;

	const files = fs.readdirSync(directoryPath);

	console.log(files);

	if (files.length === 0) {
		fs.rmdirSync(directoryPath);
		console.log("removed");
		const newhashes = hashes.slice(0, -seqlength);
		deleteEmptyDirectoriesRecursive(newhashes);
	}
	console.log("Done...");
}

// Multer storage config
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		const filePath = path.resolve(import.meta.dirname, "../upload");
		if (!fs.existsSync(filePath)) {
			fs.mkdirSync(filePath);
		}
		cb(null, filePath);
	},
	filename: function (req, file, cb) {
		cb(null, file.originalname);
	},
});

const upload = multer({ storage: storage });

// Express Server
const app = express();
const port = 3000;
const bitlength = 32;
const sessionSecret = "token";

// Default Config Settings
app.set("view engine", "pug");
app.set("views", path.resolve(import.meta.dirname, "./views"));
app.use("/public", express.static(path.resolve(import.meta.dirname, "../public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
	session({
		name: "token",
		resave: true,
		rolling: true,
		secret: sessionSecret,
		cookie: { expires: false },
		saveUninitialized: true,
	})
);

// Default listen on http://127.0.0.1:3000
app.listen(port, () => {
	console.log(`Server is running at http://127.0.0.1:${port}`);
});

// Check user is available or not
app.use((req, res, next) => {
	if (req.session.username || req.url === "/login") {
		next();
	} else if (req.method === "POST") {
		res.json({ status: 1, message: "Access Denied" });
	} else {
		res.redirect("/login");
	}
});

app.get("/login", (req, res) => {
	if (req.session.username) {
		res.redirect("/infor");
	} else {
		res.render("login");
	}
});

app.get("/infor", async (req, res) => {
	const username = req.session.username;
	const filelist = await userinfo.getfiles(username);

	res.render("infor", { username, filelist });
});

app.post("/login", async (req, res) => {
	const { username } = req.body;

	// Add user directly
	const result = await userinfo.adduser(username);

	req.session.regenerate(error => {
		if (error) {
			return res.json({ status: 1, message: "Generate Session Fail" });
		}

		req.session.username = username;

		if (result) {
			return res.json({ status: 0, message: "Register Success" });
		} else {
			return res.json({ status: 0, message: "Login Success" });
		}
	});
});

app.post("/logout", (req, res) => {
	req.session.destroy(error => {
		if (error) {
			return res.json({ status: 1, message: "Logout Failed" });
		}

		res.clearCookie(sessionSecret);
		res.json({ status: 0, message: "Logout Success" });
	});
});

app.post("/unregister", async (req, res) => {
	const username = req.session.username;
	const result = await userinfo.deluser(username);

	if (result) {
		const emptySections = await userinfo.getempty();

		if (emptySections.length !== 0) {
			for (const section of emptySections) {
				const filePath = path.resolve(
					import.meta.dirname,
					`../storage/${getFolderPath(section)}/${section}`
				);

				fs.unlinkSync(filePath);
				deleteEmptyDirectoriesRecursive(section);
				database.delete(`/sections/${section}`);
			}
		}

		req.session.destroy(error => {
			if (error) {
				// Destory session failed but unregister success
				return res.json({ status: 1, message: "Unregister Success" });
			}

			res.clearCookie(sessionSecret);
			res.json({ status: 0, message: "Unregister Success" });
		});
	} else {
		res.json({ status: 1, message: "Unregister Failed" });
	}
});

app.post("/upload", upload.single("upload"), (req, res) => {
	let sections = [];
	const username = req.session.username;
	const originalPath = req.file.path;
	const originalName = req.file.originalname;
	const readStream = fs.createReadStream(originalPath, {
		highWaterMark: bitlength,
	});

	readStream.on("data", chunk => {
		const chunkHash = sha256(chunk);
		sections.push(chunkHash);

		createDirectoryRecursive(chunkHash);
		const filePath = path.resolve(
			import.meta.dirname,
			`../storage/${getFolderPath(chunkHash)}/${chunkHash}`
		);
		const writeStream = fs.createWriteStream(filePath, { flags: "w" });
		writeStream.write(chunk);
		writeStream.end();
	});

	readStream.on("close", async () => {
		fs.unlinkSync(originalPath);
		await userinfo.uploadfile(username, originalName, sections);
		res.json({ status: 0, message: "Upload Success" });
	});

	readStream.on("error", () => {
		fs.unlinkSync(originalPath);
		res.json({ status: 0, message: "Upload Failed" });
	});
});

app.post("/delete", async (req, res) => {
	const { fileName } = req.body;
	const username = req.session.username;

	try {
		await userinfo.removefile(username, fileName);

		const emptySections = await userinfo.getempty();

		if (emptySections.length !== 0) {
			for (const section of emptySections) {
				const filePath = path.resolve(
					import.meta.dirname,
					`../storage/${getFolderPath(section)}/${section}`
				);

				fs.unlinkSync(filePath);
				deleteEmptyDirectoriesRecursive(section);
				database.delete(`/sections/${section}`);
			}
		}
		res.json({ status: 0, message: "Delete Success" });
	} catch (error) {
		res.json({ status: 1, message: "Delete Failed" });
	}
});
