import { exec } from "shelljs";

export const commit = (
	message: string,
	name = "ChangeBot",
	email = "github-actions[bot]@users.noreply.github.com",
) => {
	exec(`git add .`);
	exec(
		`git commit --author "${name} <${email}>" -m "${message.replace(/\"/g, "''")}"`,
	);
};

export const push = () => {
	const result = exec("git push");
	if (result.includes("error:")) throw new Error(result);
};
