// Publie la version compilée (dist/) sur la branche gh-pages du dépôt GitHub.
// Usage : npm run deploy   (construit puis publie)
import { execSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

const run = (cmd, cwd = ".") => execSync(cmd, { cwd, stdio: "inherit" });
const remote = execSync("git remote get-url origin").toString().trim();

writeFileSync("dist/.nojekyll", ""); // GitHub Pages sert tel quel
rmSync("dist/.git", { recursive: true, force: true });
run("git init -q -b gh-pages", "dist");
run("git add -A", "dist");
run(`git -c user.name="${execSync("git config user.name").toString().trim()}" -c user.email="${execSync("git config user.email").toString().trim()}" commit -q -m "Publication ${new Date().toISOString()}"`, "dist");
run(`git push -f ${remote} gh-pages`, "dist");
rmSync("dist/.git", { recursive: true, force: true });
console.log("Publié sur la branche gh-pages.");
