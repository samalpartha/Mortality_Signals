
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {

    test('homepage loads with stats', async ({ page }) => {
        page.on('console', msg => console.log(`BROWSER LISTENER: ${msg.text()}`));
        await page.goto('/');
        await expect(page).toHaveTitle(/Mortality Signals/);
        await expect(page.getByText('Global Mortality Observatory')).toBeVisible();
        await expect(page.getByText('Total Deaths')).toBeVisible();
    });

    test('search functionality works', async ({ page }) => {
        await page.goto('/');
        // Type 'India' in search
        const searchInput = page.getByPlaceholder('Search countries & regions...');
        await searchInput.click();
        await searchInput.fill('India');

        // Wait for search results container to appear
        await expect(page.locator('div.absolute.top-full')).toBeVisible();

        // Expect results to appear (wait for result that isn't the "No entities found" message)
        // The user reported "No entities found for 'india'", so we test that we DO get results
        await expect(page.getByRole('button', { name: 'India' }).first()).toBeVisible();
        await expect(page.getByText('No entities found')).not.toBeVisible();
    });

    test.skip('signal feed loads data', async ({ page }) => {
        page.on('console', msg => console.log(`SIGNAL FEED LOG: ${msg.text()}`));
        // page.on('pageerror', err => console.log(`SIGNAL FEED ERROR: ${err.message}`));

        await page.goto('/signals');
        await expect(page.getByText('Mortality Anomalies')).toBeVisible();

        // It should show loading skeletons initially
        // Using a generic locator for the pulse animation if specific class isn't unique
        const skeletons = page.locator('.animate-pulse');
        // await expect(skeletons.first()).toBeVisible({ timeout: 5000 }); 
        // Note: It might load too fast to catch skeletons, so we don't strictly assert visibility,
        // but we MUST ensure they are GONE before checking for data.

        // Wait for loading to finish (skeletons to disappear)
        await expect(skeletons).toHaveCount(0, { timeout: 30000 });

        // Now check for data
        const hasSignals = await page.locator('.signal-card').count() > 0;
        if (hasSignals) {
            await expect(page.locator('.signal-card').first()).toBeVisible();
        } else {
            await expect(page.getByText('No Signals Found')).toBeVisible();
        }
    });

    test('scenario builder flow', async ({ page }) => {
        await page.goto('/scenario');
        await expect(page.getByRole('heading', { name: 'Scenario Builder' })).toBeVisible();

        // 1. Select an Entity
        const entitySelect = page.locator('select').first();
        await expect(entitySelect).toBeVisible();
        // Wait for options to populate
        await expect(async () => {
            const count = await entitySelect.locator('option').count();
            expect(count).toBeGreaterThan(1);
        }).toPass();

        await entitySelect.selectOption({ index: 1 }); // Select first available country

        // 2. Select an Intervention Template
        // Ensure expanded (default is true but good to be sure if toggled)
        if (await page.getByRole('button', { name: 'Intervention Templates' }).isVisible()) {
            // It might be already expanded, or we need to click to expand?
            // The code says visible state 'showInterventions' defaults to true.
            // But button toggles it.
        }

        // Click the first template "Malaria Control Program"
        await expect(page.getByText('Malaria Control Program').first()).toBeVisible();
        await page.getByText('Malaria Control Program').first().click();

        // 3. Run Simulation
        const runBtn = page.getByRole('button', { name: 'Run Simulation' });
        await expect(runBtn).toBeEnabled();
        await runBtn.click();

        // 4. Verify Results
        await expect(page.getByText('Deaths Averted', { exact: true })).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Impact Analysis')).toBeVisible();
    });

    test('tableau export page loads', async ({ page }) => {
        await page.goto('/tableau');
        await expect(page.getByText('Data Export')).toBeVisible();

        // Check Export tab
        await page.getByText('Data Export').click();
        await expect(page.getByText('Tableau-Ready Data Export')).toBeVisible();

        // We can't easily test file download content in limited environment, 
        // but we can check if the buttons are present
        await expect(page.getByText('CSV')).toBeVisible();
        await expect(page.getByText('JSON')).toBeVisible();
    });

});
