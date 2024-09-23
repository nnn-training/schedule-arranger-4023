const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["query"] });

async function getColorMode(user) {
  if (user !== undefined) {
    const setting = await prisma.setting.findUnique({
      where: { userId: user.id },
    });
    return setting?.colorMode || "light"; // デフォルトはlight
  } else {
    return "light"; // デフォルトはlight
  }
}

module.exports = getColorMode;