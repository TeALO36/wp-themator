<?php
if ( ! defined( 'ABSPATH' ) ) exit;

if ( isset($_POST['tmopt_layout_nonce']) && wp_verify_nonce($_POST['tmopt_layout_nonce'],'themator_save_layout') ) {
    $lfields = ['tmopt_content_width','tmopt_section_padding','tmopt_gutter','tmopt_body_bg','tmopt_body_color'];
    foreach ($lfields as $f) {
        update_option($f, sanitize_text_field(wp_unslash($_POST[$f] ?? '')));
    }
    echo '<div class="tm-notice tm-notice-success">✅ Layout sauvegardé.</div>';
}

$content_width   = get_option('tmopt_content_width','1080');
$section_padding = get_option('tmopt_section_padding','60px 20px');
$gutter          = get_option('tmopt_gutter','20');
$body_bg         = get_option('tmopt_body_bg','#ffffff');
$body_color      = get_option('tmopt_body_color','#333333');
?>
<div class="themator-admin-wrap">
    <?php themator_admin_header('Layout'); ?>
    <form method="post">
        <?php wp_nonce_field('themator_save_layout','tmopt_layout_nonce'); ?>

        <div class="tm-admin-section">
            <h2>📐 Largeurs & Marges</h2>
            <div class="tm-field-row">
                <div class="tm-field-label">Largeur max du contenu<div class="tm-field-desc">Largeur maximale des sections (en px). Divi : 1080px par défaut.</div></div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="number" name="tmopt_content_width" value="<?php echo esc_attr($content_width); ?>" min="600" max="2400" style="width:120px;">
                    <span style="color:#999;">px</span>
                </div>
            </div>
            <div class="tm-field-row">
                <div class="tm-field-label">Padding par défaut des sections<div class="tm-field-desc">Valeur CSS : ex. <code>60px 20px</code></div></div>
                <input type="text" name="tmopt_section_padding" value="<?php echo esc_attr($section_padding); ?>" style="width:200px;" placeholder="60px 20px">
            </div>
            <div class="tm-field-row">
                <div class="tm-field-label">Gouttière colonnes<div class="tm-field-desc">Espace entre les colonnes dans une ligne (px).</div></div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="number" name="tmopt_gutter" value="<?php echo esc_attr($gutter); ?>" min="0" max="80" style="width:100px;">
                    <span style="color:#999;">px</span>
                </div>
            </div>
        </div>

        <div class="tm-admin-section">
            <h2>🎨 Couleurs Globales</h2>
            <div class="tm-field-row">
                <div class="tm-field-label">Couleur de fond du body</div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="color" name="tmopt_body_bg" value="<?php echo esc_attr($body_bg); ?>">
                    <code><?php echo esc_html($body_bg); ?></code>
                </div>
            </div>
            <div class="tm-field-row">
                <div class="tm-field-label">Couleur de texte du body</div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <input type="color" name="tmopt_body_color" value="<?php echo esc_attr($body_color); ?>">
                    <code><?php echo esc_html($body_color); ?></code>
                </div>
            </div>
        </div>

        <div class="tm-btn-row">
            <button type="submit" class="tm-btn tm-btn-primary">💾 Sauvegarder le Layout</button>
        </div>
    </form>
</div>
