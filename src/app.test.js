"use strict";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["query"] });

const { randomUUID } = require("node:crypto");


const testUser = {
  userId: 0,
  username: "testuser",
};

function mockIronSession() {
  const ironSession = require("iron-session");
  jest.spyOn(ironSession, "getIronSession").mockReturnValue({
    user: { login: testUser.username, id: testUser.userId },
    save: jest.fn(),
    destroy: jest.fn(),
  });
}

// テストで作成したデータを削除
async function deleteScheduleAggregate(scheduleId) {
  const { deleteScheduleAggregate } = require("./routes/schedules");
  await deleteScheduleAggregate(scheduleId);
}

// フォームからリクエストを送信する
async function sendFormRequest(app, path, body) {
  return app.request(path, {
    method: "POST",
    body: new URLSearchParams(body),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "http://localhost:3000",
    },
  });
}

// JSON を含んだリクエストを送信する
async function sendJsonRequest(app, path, body) {
  return app.request(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("/login", () => {
  beforeAll(() => {
    mockIronSession();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test("ログインのためのリンクが含まれる", async () => {
    const app = require("./app");
    const res = await app.request("/login");
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");
    expect(await res.text()).toMatch(/<a href="\/auth\/github"/);
    expect(res.status).toBe(200);
  });

  test("ログイン時はユーザ名が表示される", async () => {
    const app = require("./app");
    const res = await app.request("/login");
    expect(await res.text()).toMatch(/testuser/);
    expect(res.status).toBe(200);
  });
});

describe("/logout", () => {
  test("/ にリダイレクトされる", async () => {
    const app = require("./app");
    const res = await app.request("/logout");
    expect(res.headers.get("Location")).toBe("/");
    expect(res.status).toBe(302);
  });
});

describe("/", () => {
  const { provisionalCandidateAcquisition } = require("./routes/index");
  let userTest;
  let testSchedule;
  let candidateA, candidateB;

  beforeAll(async () => {
    mockIronSession();
    await prisma.user.deleteMany({ where: { userId: -1 } }); // userId-1があった場合削除
    userTest = await prisma.user.create({
    data: {
    userId: -1,
    username: "userTest",
  },
});

    // スケジュールと候補作成
    const scheduleId = randomUUID();
    testSchedule = await prisma.schedule.create({
      data: {
        scheduleId,
        scheduleName: "テストスケジュール",
        memo: "テストメモ",
        createdBy: userTest.userId,
        updatedAt: new Date(),
        provisionalDecision: 0, // 後で更新
        candidates: {
          create: [
            { candidateName: "候補A" },
            { candidateName: "候補B" },
          ],
        },
      },
      include: { candidates: true },
    });

    // 候補取得
    candidateA = testSchedule.candidates[0];
    candidateB = testSchedule.candidates[1];

    // 仮決定候補を設定
    await prisma.schedule.update({
      where: { scheduleId: testSchedule.scheduleId },
      data: { provisionalDecision: candidateA.candidateId },
    });
  });

  afterAll(async () => {
    // テストデータ削除
    await prisma.availability.deleteMany({ where: { scheduleId: testSchedule.scheduleId } });
    await prisma.comment.deleteMany({ where: { scheduleId: testSchedule.scheduleId } });
    await prisma.candidate.deleteMany({ where: { scheduleId: testSchedule.scheduleId } });
    await prisma.schedule.delete({ where: { scheduleId: testSchedule.scheduleId } });
    await prisma.user.delete({ where: { userId: userTest.userId } });
    await prisma.$disconnect();
  });

  test("仮決定候補が正しく取得される", async () => {
    const result = await provisionalCandidateAcquisition(testSchedule.scheduleId);
    expect(result).toBe("候補A");
  });

  test("仮決定候補が存在しない場合は '未定' を返す", async () => {
    await prisma.schedule.update({
      where: { scheduleId: testSchedule.scheduleId },
      data: { provisionalDecision: 999999 }, // 存在しないID
    });

    const result = await provisionalCandidateAcquisition(testSchedule.scheduleId);
    expect(result).toBe("未定");
  });
});

describe("/schedules", () => {
  let scheduleId = "";
  beforeAll(() => {
    mockIronSession();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await deleteScheduleAggregate(scheduleId);
  });

  test("予定が作成でき、表示される", async () => {
    await prisma.user.upsert({
      where: { userId: testUser.userId },
      create: testUser,
      update: testUser,
    });

    const app = require("./app");

    const postRes = await sendFormRequest(app, "/schedules", {
      scheduleName: "テスト予定1",
      memo: "テストメモ1\r\nテストメモ2",
      candidates: "テスト候補1\r\nテスト候補2\r\nテスト候補3",
    });

    const createdSchedulePath = postRes.headers.get("Location");
    expect(createdSchedulePath).toMatch(/schedules/);
    expect(postRes.status).toBe(302);

    scheduleId = createdSchedulePath.split("/schedules/")[1];

    const res = await app.request(createdSchedulePath);
    const body = await res.text();
    expect(body).toMatch(/テスト予定1/);
    expect(body).toMatch(/テストメモ1/);
    expect(body).toMatch(/テストメモ2/);
    expect(body).toMatch(/テスト候補1/);
    expect(body).toMatch(/テスト候補2/);
    expect(body).toMatch(/テスト候補3/);
    expect(res.status).toBe(200);
  });
  test("出欠画面で仮決定候補が表示される",() => {
    const schedule = {
      provisionalDecision : 2,
    };

    const candidates = [
      { candidateId: 1, candidateName: "候補A" },
      { candidateId: 2, candidateName: "候補B" },
      { candidateId: 3, candidateName: "候補C" },
    ];

    const provisionalCandidate = candidates.find(
      (c) => c.candidateId === schedule.provisionalDecision
    );
    expect(provisionalCandidate.candidateId).toBe(2);
    expect(provisionalCandidate.candidateName).toBe("候補B");
  });
});

describe("/schedules/:scheduleId/users/:userId/candidates/:candidateId", () => {
  let scheduleId = "";
  beforeAll(() => {
    mockIronSession();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await deleteScheduleAggregate(scheduleId);
  });

  test("出欠が更新できる", async () => {
    await prisma.user.upsert({
      where: { userId: testUser.userId },
      create: testUser,
      update: testUser,
    });

    const app = require("./app");

    const postRes = await sendFormRequest(app, "/schedules", {
      scheduleName: "テスト出欠更新予定1",
      memo: "テスト出欠更新メモ1",
      candidates: "テスト出欠更新候補1",
    });

    const createdSchedulePath = postRes.headers.get("Location");
    scheduleId = createdSchedulePath.split("/schedules/")[1];

    const candidate = await prisma.candidate.findFirst({
      where: { scheduleId },
    });

    const res = await sendJsonRequest(
      app,
      `/schedules/${scheduleId}/users/${testUser.userId}/candidates/${candidate.candidateId}`,
      {
        availability: 2,
      },
    );

    expect(await res.json()).toEqual({ status: "OK", availability: 2 });

    const availabilities = await prisma.availability.findMany({
      where: { scheduleId },
    });
    expect(availabilities.length).toBe(1);
    expect(availabilities[0].availability).toBe(2);
  });
});

describe("/schedules/:scheduleId/users/:userId/comments", () => {
  let scheduleId = "";
  beforeAll(() => {
    mockIronSession();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await deleteScheduleAggregate(scheduleId);
  });

  test("コメントが更新できる", async () => {
    await prisma.user.upsert({
      where: { userId: testUser.userId },
      create: testUser,
      update: testUser,
    });

    const app = require("./app");

    const postRes = await sendFormRequest(app, "/schedules", {
      scheduleName: "テストコメント更新予定1",
      memo: "テストコメント更新メモ1",
      candidates: "テストコメント更新候補1",
    });

    const createdSchedulePath = postRes.headers.get("Location");
    scheduleId = createdSchedulePath.split("/schedules/")[1];

    const res = await sendJsonRequest(
      app,
      `/schedules/${scheduleId}/users/${testUser.userId}/comments`,
      {
        comment: "testcomment",
      },
    );

    expect(await res.json()).toEqual({ status: "OK", comment: "testcomment" });

    const comments = await prisma.comment.findMany({ where: { scheduleId } });
    expect(comments.length).toBe(1);
    expect(comments[0].comment).toBe("testcomment");
  });
});

describe("/schedules/:scheduleId/update", () => {
  let scheduleId = "";
  beforeAll(() => {
    mockIronSession();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await deleteScheduleAggregate(scheduleId);
  });

  test("予定が更新でき、候補が追加できる", async () => {
    await prisma.user.upsert({
      where: { userId: testUser.userId },
      create: testUser,
      update: testUser,
    });

    const app = require("./app");

    const postRes = await sendFormRequest(app, "/schedules", {
      scheduleName: "テスト更新予定1",
      memo: "テスト更新メモ1",
      candidates: "テスト更新候補1",
      provisionalDecision: "0",
    });

    const createdSchedulePath = postRes.headers.get("Location");
    scheduleId = createdSchedulePath.split("/schedules/")[1];

    const res = await sendFormRequest(app, `/schedules/${scheduleId}/update`, {
      scheduleName: "テスト更新予定2",
      memo: "テスト更新メモ2",
      candidates: "テスト更新候補2",
      provisionalDecision: "200",
    });

    const schedule = await prisma.schedule.findUnique({
      where: { scheduleId },
    });
    expect(schedule.scheduleName).toBe("テスト更新予定2");
    expect(schedule.memo).toBe("テスト更新メモ2");
    expect(schedule.provisionalDecision).toBe(200);

    const candidates = await prisma.candidate.findMany({
      where: { scheduleId },
      orderBy: { candidateId: "asc" },
    });
    expect(candidates.length).toBe(2);
    expect(candidates[0].candidateName).toBe("テスト更新候補1");
    expect(candidates[1].candidateName).toBe("テスト更新候補2");
  });
});

describe("/schedules/:scheduleId/delete", () => {
  beforeAll(() => {
    mockIronSession();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test("予定に関連する全ての情報が削除できる", async () => {
    await prisma.user.upsert({
      where: { userId: testUser.userId },
      create: testUser,
      update: testUser,
    });

    const app = require("./app");

    const postRes = await sendFormRequest(app, "/schedules", {
      scheduleName: "テスト削除予定1",
      memo: "テスト削除メモ1",
      candidates: "テスト削除候補1",
    });

    const createdSchedulePath = postRes.headers.get("Location");
    const scheduleId = createdSchedulePath.split("/schedules/")[1];

    // 出欠作成
    const candidate = await prisma.candidate.findFirst({
      where: { scheduleId },
    });
    await sendJsonRequest(
      app,
      `/schedules/${scheduleId}/users/${testUser.userId}/candidates/${candidate.candidateId}`,
      {
        availability: 2,
      },
    );

    // コメント作成
    await sendJsonRequest(
      app,
      `/schedules/${scheduleId}/users/${testUser.userId}/comments`,
      {
        comment: "testcomment",
      },
    );

    // 削除
    const res = await app.request(`/schedules/${scheduleId}/delete`, {
      method: "POST",
      headers: {
        'Origin': 'http://localhost:3000',
      },
    });
    expect(res.status).toBe(302);

    // テスト
    const availabilities = await prisma.availability.findMany({
      where: { scheduleId },
    });
    expect(availabilities.length).toBe(0);

    const candidates = await prisma.candidate.findMany({
      where: { scheduleId },
    });
    expect(candidates.length).toBe(0);

    const comments = await prisma.comment.findMany({ where: { scheduleId } });
    expect(comments.length).toBe(0);

    const schedule = await prisma.schedule.findUnique({
      where: { scheduleId },
    });
    expect(schedule).toBeNull();
  });
});
