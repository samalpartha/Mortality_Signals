
import { test, expect } from '@playwright/test';

test('homepage has title and navigation', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Mortality Signals/);
});

test('observatory page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Global Mortality Observatory')).toBeVisible();

    // Check for stats cards
    await expect(page.getByText('Total Deaths')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Explore Entities' })).toBeVisible();
});

test('navigation works', async ({ page }) => {
    await page.goto('/');

    // Click on Signal Feed
    await page.getByRole('link', { name: 'Signal Feed' }).click();
    await expect(page.getByText('Mortality Anomalies')).toBeVisible();

    // Click on Scenario Builder
    await page.getByRole('link', { name: 'Scenario Builder' }).click();
    await expect(page.getByRole('heading', { name: 'Scenario Builder' })).toBeVisible();
});

test('tableau page loads', async ({ page }) => {
    await page.goto('/tableau');
    // Check for the Tableau container or loading state
    await expect(page.getByText(/Global Mortality Overview/)).toBeVisible();
    // Note: Tableau iframe might take time to load, so we check for the page header
});
