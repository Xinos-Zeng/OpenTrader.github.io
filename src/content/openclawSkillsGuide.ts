const SKILLS_REPO = 'https://github.com/xinos-zeng/TqSim-Trade-Skills-Openclaw';

/**
 * 发给 OpenClaw（龙虾）的简短说明：仅引导安装；具体用法见技能包内教程。
 */
export function buildOpenClawSkillsGuideText(): string {
  return `请帮我安装「TqSim 期货回测」OpenClaw 技能包。

仓库：${SKILLS_REPO}

在本机终端执行一键安装：
curl -fsSL https://raw.githubusercontent.com/xinos-zeng/TqSim-Trade-Skills-Openclaw/main/install-from-github.sh | bash

安装完成后，如何调用、参数与示例请以技能包内 SKILL.md / README 为准。`;
}
