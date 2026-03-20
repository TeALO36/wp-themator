<?php
if ( ! defined( 'ABSPATH' ) ) exit;

if ( isset( $_POST['tmopt_seo_nonce'] ) && wp_verify_nonce( $_POST['tmopt_seo_nonce'], 'themator_save_seo' ) ) {
    $fields = ['tmopt_seo_title_tmpl','tmopt_seo_desc_tmpl','tmopt_seo_og','tmopt_seo_robots','tmopt_seo_canonical'];
    foreach ($fields as $f) {
        if ( in_array($f, ['tmopt_seo_og','tmopt_seo_canonical']) ) {
            update_option($f, isset($_POST[$f]) ? '1' : '0');
        } else {
            update_option($f, sanitize_text_field(wp_unslash($_POST[$f] ?? '')));
        }
    }
    echo '<div class="tm-notice tm-notice-success">✅ SEO sauvegardé.</div>';
}

$title_tmpl = get_option('tmopt_seo_title_tmpl', '%title% | %site_name%');
$desc_tmpl  = get_option('tmopt_seo_desc_tmpl', '');
$og         = get_option('tmopt_seo_og', '1');
$robots     = get_option('tmopt_seo_robots', 'index,follow');
$canonical  = get_option('tmopt_seo_canonical', '1');
?>
<div class="themator-admin-wrap">
    <?php themator_admin_header('SEO'); ?>
    <form method="post">
        <?php wp_nonce_field('themator_save_seo','tmopt_seo_nonce'); ?>

        <div class="tm-admin-section">
            <h2>🔍 Titres & Descriptions</h2>
            <div class="tm-field-row">
                <div class="tm-field-label">Template titre<div class="tm-field-desc">Variables : <code>%title%</code>, <code>%site_name%</code>, <code>%page_num%</code></div></div>
                <input type="text" name="tmopt_seo_title_tmpl" value="<?php echo esc_attr($title_tmpl); ?>" style="width:100%;max-width:500px;" placeholder="%title% | %site_name%">
            </div>
            <div class="tm-field-row">
                <div class="tm-field-label">Description globale<div class="tm-field-desc">Utilisée si la page n'a pas de méta description.</div></div>
                <textarea name="tmopt_seo_desc_tmpl" rows="3" style="width:100%;max-width:600px;" placeholder="Description par défaut du site..."><?php echo esc_textarea($desc_tmpl); ?></textarea>
            </div>
        </div>

        <div class="tm-admin-section">
            <h2>📊 Open Graph & Réseaux sociaux</h2>
            <div class="tm-field-row">
                <div class="tm-field-label">Activer Open Graph<div class="tm-field-desc">Génère les balises og: pour Facebook/LinkedIn/Twitter.</div></div>
                <label style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" name="tmopt_seo_og" value="1" <?php checked($og,'1'); ?>>
                    Oui
                </label>
            </div>
        </div>

        <div class="tm-admin-section">
            <h2>🤖 Robots & Canonical</h2>
            <div class="tm-field-row">
                <div class="tm-field-label">Directive robots globale</div>
                <select name="tmopt_seo_robots">
                    <option value="index,follow"    <?php selected($robots,'index,follow'); ?>>index, follow (recommandé)</option>
                    <option value="noindex,follow"  <?php selected($robots,'noindex,follow'); ?>>noindex, follow</option>
                    <option value="index,nofollow"  <?php selected($robots,'index,nofollow'); ?>>index, nofollow</option>
                    <option value="noindex,nofollow"<?php selected($robots,'noindex,nofollow'); ?>>noindex, nofollow</option>
                </select>
            </div>
            <div class="tm-field-row">
                <div class="tm-field-label">URL canonique automatique<div class="tm-field-desc">Ajoute <code>&lt;link rel="canonical"&gt;</code> sur chaque page.</div></div>
                <label style="display:flex;align-items:center;gap:8px;">
                    <input type="checkbox" name="tmopt_seo_canonical" value="1" <?php checked($canonical,'1'); ?>>
                    Activer
                </label>
            </div>
        </div>

        <div class="tm-btn-row">
            <button type="submit" class="tm-btn tm-btn-primary">💾 Sauvegarder SEO</button>
        </div>
    </form>
</div>
