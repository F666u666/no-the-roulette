import { test, expect } from '@playwright/test';
test('members, unique draws, individual and full rerolls, persistence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.member-card')).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'START', exact: true })).toBeDisabled();
  for (const name of ['いっさ', 'ジェン', 'NO6'])
    await page.getByRole('button', { name: new RegExp(name + '.*89') }).click();
  await expect(page.locator('.selection-count')).toContainText('03');
  await page.getByRole('button', { name: 'START', exact: true }).click();
  await expect(page.locator('.result-card')).toHaveCount(3);
  const first = await page.locator('.result-label strong').allTextContents();
  expect(new Set(first).size).toBe(3);
  await page.locator('.result-face').first().click();
  await page.getByRole('button', { name: 'この人だけもう一度', exact: true }).click();
  await expect(page.locator('.result-label strong').first()).not.toHaveText(first[0]);
  expect((await page.locator('.result-label strong').allTextContents()).slice(1)).toEqual(
    first.slice(1),
  );
  const before = await page.locator('.result-label strong').allTextContents();
  await page.getByRole('button', { name: 'もう一度抽選' }).click();
  const after = await page.locator('.result-label strong').allTextContents();
  expect(new Set(after).size).toBe(3);
  after.forEach((f, i) => expect(f).not.toBe(before[i]));
  await page.getByRole('button', { name: 'メンバー変更' }).click();
  await page.reload();
  await expect(page.locator('.member-card[aria-pressed="true"]')).toHaveCount(3);
  expect(errors).toEqual([]);
});
test('add, empty draft recovery, landscape edit, rename, delete confirmation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.getByRole('button', { name: 'プレイヤー追加' }).click();
  await page.getByLabel('プレイヤー名').fill('テストメンバー');
  await page.getByRole('button', { name: '追加', exact: true }).click();
  await expect(page.getByRole('button', { name: '完了', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.locator('.editor')).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('.rotate-hint')).toBeHidden();
  await page.getByRole('button', { name: 'マリオ', exact: true }).click();
  await page.getByRole('button', { name: 'ソラ', exact: true }).click();
  await page.getByRole('button', { name: '完了', exact: true }).click();
  await expect(page.locator('.profile-name')).toHaveText('テストメンバー');
  const color = await page.locator('.detail-screen').getAttribute('style');
  await page.getByRole('button', { name: '名前を変更' }).click();
  await page.getByLabel('プレイヤー名').fill('変更した名前');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.locator('.profile-name')).toHaveText('変更した名前');
  expect(await page.locator('.detail-screen').getAttribute('style')).toBe(color);
  await page.getByRole('button', { name: 'プレイヤーを削除' }).click();
  await page.getByRole('button', { name: 'キャンセル' }).click();
  await expect(page.locator('.detail-screen')).toBeVisible();
  await page.getByRole('button', { name: 'プレイヤーを削除' }).click();
  await page.getByRole('button', { name: '削除', exact: true }).click();
  await expect(page.locator('.settings-card')).toHaveCount(10);
});
test('installed cache reloads offline, including unused art and SE', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await expect(page.getByText('オフラインの準備完了')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.member-card')).toHaveCount(10);
  await page.locator('.member-card').first().click();
  await page.locator('.start').click();
  await expect(page.locator('.result-card')).toHaveCount(1);
  expect(
    await page.evaluate(async () => {
      const paths = ['/fighters/sora.webp', '/assets/sounds/reroll.wav', '/assets/mascots/11.svg'];
      return Promise.all(paths.map(async (path) => (await fetch(path)).ok));
    }),
  ).toEqual([true, true, true]);
  await page.getByRole('button', { name: 'メンバー変更' }).click();
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.locator('.settings-card').first().click();
  await page.locator('.candidate-preview').click();
  await expect(page.locator('.fighter-cell')).toHaveCount(89);
  expect(
    await page
      .locator('img')
      .evaluateAll((imgs) =>
        imgs.every(
          (img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
        ),
      ),
  ).toBe(true);
});
test('small and large iPhone layouts keep controls reachable with no horizontal overflow', async ({
  page,
}) => {
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 932 });
    await page.goto('/');
    await expect(page.locator('.member-card')).toHaveCount(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.locator('.start')).toBeInViewport();
    if ((await page.locator('.member-card').last().getAttribute('aria-pressed')) !== 'true')
      await page.locator('.member-card').last().click();
    await expect(page.locator('.member-card').last()).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '設定', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
test('fighter search and selected-only view preserve the candidate pool', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '設定', exact: true }).click();
  await page.locator('.settings-card').first().click();
  await page.locator('.candidate-preview').click();
  const query = page.getByRole('textbox', { name: 'ファイターを検索' });
  await query.fill('joker');
  await expect(page.locator('.fighter-cell')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'ジョーカー', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'ジョーカー', exact: true }).click();
  await page.getByRole('button', { name: '選択中', exact: true }).click();
  await expect(page.locator('.fighter-cell')).toHaveCount(0);
  await expect(page.getByText('一致するファイターがいません')).toBeVisible();
  await query.fill('');
  await expect(page.locator('.fighter-cell')).toHaveCount(88);
  await page.getByRole('button', { name: 'すべて', exact: true }).click();
  await expect(page.locator('.fighter-cell')).toHaveCount(89);
  await page.getByRole('button', { name: '完了', exact: true }).click();
  await expect(page.locator('.preview-title')).toContainText('88');
});
