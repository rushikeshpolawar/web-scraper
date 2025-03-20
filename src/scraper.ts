import { chromium } from "playwright";
import readlineSync from "readline-sync";
import dotenv from "dotenv";

dotenv.config();

export async function scrapePurchaseHistory() {
  const email = process.env.EMAIL || readlineSync.question("Enter your email: ");
  const password = process.env.PASSWORD || readlineSync.question("Enter your password: ", { hideEchoBack: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("Navigating to Amazon...");
    await page.goto("https://www.amazon.com/ap/signin");

    console.log("Logging in...");
    await page.fill('input[name="email"]', email);
    await page.click('input#continue');
    await page.fill('input[name="password"]', password);
    await page.click('input#signInSubmit');

    // Handle MFA manually if prompted
    console.log("If prompted, complete MFA manually...");

    // Navigate to order history
    await page.waitForTimeout(5000);
    await page.goto("https://www.amazon.com/ap/your-account/order-history");

    console.log("Extracting purchase history...");
    await page.waitForSelector(".a-box-group");

    const orders = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".a-box-group"))
        .slice(0, 10)
        .map(order => {
          const name = order.querySelector(".a-text-bold")?.textContent?.trim() || "N/A";
          const price = order.querySelector(".a-color-price")?.textContent?.trim() || "N/A";
          const linkElement = order.querySelector(".a-link-normal") as HTMLAnchorElement;
          const link = linkElement ? `https://www.amazon.com${linkElement.getAttribute("href")}` : "N/A";

          return { name, price, link };
        });
    });

    console.log("Purchase History:", JSON.stringify(orders, null, 2));

    await browser.close();
    return orders;
  } catch (error) {
    console.error("Error during scraping:", error);
    await browser.close();
  }
}
