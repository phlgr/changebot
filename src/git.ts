import { exec } from "shelljs";

export const commit = (
	message: string,
	name = "ChangeBot",
	email = "github-actions[bot]@users.noreply.github.com",
) => {
	exec(`git config user.email "${email}"`);
	exec(`git config user.name "${name}"`);
	exec(`git add .`);
	exec(`git commit -m "${message.replace(/\"/g, "''")}"`);
};

export const push = () => {
	const result = exec("git push");
	if (result.includes("error:")) throw new Error(result);
};
