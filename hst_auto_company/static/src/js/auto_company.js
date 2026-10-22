/** @odoo-module **/
import { session } from "@web/session";
import { user } from "@web/core/user";
import { registry } from "@web/core/registry";

const autoCompanyService = {
    dependencies: [],
    start() {
        if (!session.auto_select_all_companies) {
            return;
        }
        // Wait for user data to be ready, then activate all allowed companies
        const allowedIds = user.allowedCompanies.map((c) => c.id);
        const activeIds = user.activeCompanies.map((c) => c.id);

        // Only auto-select if not all companies are already active
        if (allowedIds.length > 0 && allowedIds.length !== activeIds.length) {
            user.activateCompanies(allowedIds, {
                includeChildCompanies: false,
                reload: true,
            });
        }
    },
};

registry.category("services").add("hst_auto_company", autoCompanyService);
