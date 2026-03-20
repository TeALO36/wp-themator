<?php
if ( ! defined( 'ABSPATH' ) ) exit;

if ( isset($_POST['tmopt_intg_nonce']) && wp_verify_nonce($_POST['tmopt_intg_nonce'],'themator_save_integration') ) {
    update_option('tmopt_head_code',  wp_kses_post(wp_unslash($_POST['tmopt_head_code']  ?? '')));
    update_option('tmopt_body_code',  wp_kses_post(wp_unslash($_POST['tmopt_body_code']  ?? '')));
    update_option('tmopt_footer_code',wp_kses_post(wp_unslash($_POST['tmopt_footer_code']?? '')));
    echo '<div class="tm-notice tm-notice-success">✅ Intégrations sauvegardées.</div>';
}

$head_code   = get_option('tmopt_head_code','');
$body_code   = get_option('tmopt_body_code','');
$footer_code = get_option('tmopt_footer_code','');
?>
<div class="themator-admin-wrap">
    <?php themator_admin_header('Intégrations'); ?>
    <form method="post">
        <?php wp_nonce_field('themator_save_integration','tmopt_intg_nonce'); ?>

        <div class="tm-admin-section">
            <h2>🔧 Injection de code</h2>
            <p style="color:#666;font-size:13px;margin:0 0 20px;">Utilisez cette section pour intégrer des scripts analytics, pixels publicitaires, bibliothèques externes, etc.</p>

            <div class="tm-field-row" style="flex-direction:column;align-items:flex-start;gap:8px;">
                <div class="tm-field-label">
                    Code avant <code>&lt;/head&gt;</code>
                    <div class="tm-field-desc">Google Analytics, balises meta, CSS externe, etc.</div>
                </div>
                <textarea name="tmopt_head_code" rows="6" style="width:100%;font-family:monospace;font-size:12px;" placeholder="<!-- Google Analytics, Meta Pixel, etc. -->"><?php echo esc_textarea($head_code); ?></textarea>
            </div>

            <div class="tm-field-row" style="flex-direction:column;align-items:flex-start;gap:8px;margin-top:20px;">
                <div class="tm-field-label">
                    Code après <code>&lt;body&gt;</code>
                    <div class="tm-field-desc">Google Tag Manager body snippet, etc.</div>
                </div>
                <textarea name="tmopt_body_code" rows="6" style="width:100%;font-family:monospace;font-size:12px;" placeholder="<!-- GTM noscript, etc. -->"><?php echo esc_textarea($body_code); ?></textarea>
            </div>

            <div class="tm-field-row" style="flex-direction:column;align-items:flex-start;gap:8px;margin-top:20px;">
                <div class="tm-field-label">
                    Code avant <code>&lt;/body&gt;</code>
                    <div class="tm-field-desc">Scripts JS externes, chat widgets, etc.</div>
                </div>
                <textarea name="tmopt_footer_code" rows="6" style="width:100%;font-family:monospace;font-size:12px;" placeholder="<!-- Scripts footer -->"><?php echo esc_textarea($footer_code); ?></textarea>
            </div>
        </div>

        <div class="tm-btn-row">
            <button type="submit" class="tm-btn tm-btn-primary">💾 Sauvegarder les intégrations</button>
        </div>
    </form>
</div>
