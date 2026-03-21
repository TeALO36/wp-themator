<?php
/**
 * Themator Builder – Page plein écran dédiée
 * Accessible via: /wp-admin/admin.php?page=themator-builder&post=POST_ID
 *
 * Ce fichier génère une page fullscreen SANS le wrapper WordPress (pas de menu,
 * pas d'admin bar, pas de Gutenberg). Le builder est affiché directement.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Enregistre la page admin cachée qui sert de canvas fullscreen.
 * Elle est "cachée" (pas de parent) donc n'apparaît pas dans les menus.
 */
function themator_register_builder_page() {
    add_submenu_page(
        null,                          // Pas de parent = page cachée
        'Themator Builder',
        'Themator Builder',
        'edit_posts',
        'themator-builder',
        'themator_render_builder_page'
    );
}
add_action( 'admin_menu', 'themator_register_builder_page' );

/**
 * Render la page builder fullscreen.
 * On court-circuite le wrapper WordPress en sortant le HTML directement.
 */
function themator_render_builder_page() {
    if ( ! current_user_can( 'edit_posts' ) ) {
        wp_die( 'Permission refusée.' );
    }

    $post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
    if ( ! $post_id ) {
        wp_die( 'ID de page manquant.' );
    }

    $post = get_post( $post_id );
    if ( ! $post ) {
        wp_die( 'Page introuvable.' );
    }

    $saved_state = get_post_meta( $post_id, '_themator_data', true );
    $page_title  = esc_html( get_the_title( $post_id ) );
    $ajax_url    = admin_url( 'admin-ajax.php' );
    $nonce       = wp_create_nonce( 'themator_save_data' );

    $builder_css_url = plugins_url( 'assets/css/builder.css', dirname( __FILE__ ) . '/themator.php' );
    $builder_js_url  = plugins_url( 'assets/js/builder.js',  dirname( __FILE__ ) . '/themator.php' );
    $version         = THEMATOR_VERSION;

    // On sort du contexte WordPress pour afficher une page HTML propre
    ?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $page_title; ?> — Themator Builder</title>
    <link rel="stylesheet" href="<?php echo esc_url( $builder_css_url ); ?>?ver=<?php echo $version; ?>">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; background: #f4f4f4; }
    </style>
    <?php
    // Charger wp-media pour le media picker
    wp_enqueue_media();
    wp_print_styles();
    wp_print_head_scripts();
    ?>
</head>
<body>
    <!-- Le même markup HTML que l'overlay, mais cette fois c'est la page entière -->
    <div id="themator-builder-overlay" style="display:flex;">
        <div class="tm-admin-bar">
            <span class="tm-admin-bar-logo">THEMATOR PRO</span>
            <a href="<?php echo esc_url( get_edit_post_link( $post_id ) ); ?>" class="tm-exit-btn" id="tm-close-builder" style="text-decoration:none;">Quitter l'éditeur</a>
        </div>

        <div class="tm-builder-topbar">
            <span class="tm-topbar-page-name"><?php echo $page_title; ?></span>
            <div class="tm-topbar-center" id="tm-resp-bar" style="display:flex;gap:4px;align-items:center;">
                <button type="button" data-resp="desktop" title="Desktop" style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:3px;padding:5px 10px;cursor:pointer;font-size:13px;">🖥️</button>
                <button type="button" data-resp="tablet"  title="Tablette" style="background:transparent;border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:3px;padding:5px 10px;cursor:pointer;font-size:13px;">📟</button>
                <button type="button" data-resp="mobile"  title="Mobile"   style="background:transparent;border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:3px;padding:5px 10px;cursor:pointer;font-size:13px;">📱</button>
                <span style="width:1px;height:20px;background:rgba(255,255,255,0.2);margin:0 6px;display:inline-block;"></span>
                <button type="button" id="tm-undo-btn" title="Annuler (Ctrl+Z)" style="background:transparent;border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:3px;padding:5px 10px;cursor:pointer;font-size:14px;">↩</button>
                <button type="button" id="tm-redo-btn" title="Rétablir (Ctrl+Y)" style="background:transparent;border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:3px;padding:5px 10px;cursor:pointer;font-size:14px;">↪</button>
            </div>
            <div class="tm-topbar-actions">
                <button type="button" id="tm-apply-builder" style="background:#00c14d;color:#fff;border:none;padding:8px 22px;border-radius:5px;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:0.3px;">Enregistrer</button>
            </div>
        </div>

        <div class="tm-builder-canvas" id="tm-canvas"></div>

        <div class="tm-fab-container">
            <div class="tm-fab-menu" id="tm-fab-menu">
                <button type="button" class="tm-fab-action">🕒 Historique</button>
            </div>
            <button type="button" class="tm-fab-button" id="tm-fab-main-toggle">⋯</button>
        </div>

        <!-- Modal Paramètres -->
        <div class="tm-modal" id="tm-settings-modal">
            <div class="tm-modal-header">
                <span class="tm-modal-title" id="tm-modal-title">Paramètres</span>
                <div class="tm-modal-header-actions">
                    <button type="button" class="tm-modal-close-btn" id="tm-modal-cancel">✕</button>
                    <button type="button" class="tm-modal-save-btn" id="tm-modal-save">✓</button>
                </div>
            </div>
            <div class="tm-modal-tabs">
                <button type="button" class="tm-modal-tab active">Contenu</button>
                <button type="button" class="tm-modal-tab">Design</button>
                <button type="button" class="tm-modal-tab">Avancé</button>
            </div>
            <div class="tm-modal-body" id="tm-modal-body"></div>
        </div>

        <!-- Champ caché pour la sauvegarde AJAX -->
        <input type="hidden" id="themator_data_input" value="<?php echo esc_attr( $saved_state ); ?>">
        <input type="hidden" id="themator_html_input" value="">
    </div>

    <script>
    // Config transmise au builder JS (remplace wp_localize_script)
    var tmatorConfig = {
        ajaxUrl:    <?php echo json_encode( $ajax_url ); ?>,
        nonce:      <?php echo json_encode( $nonce ); ?>,
        postId:     <?php echo (int) $post_id; ?>,
        // savedState is passed as a JSON-encoded PHP string so special chars
        // (quotes, backslashes, etc.) inside the HTML are properly escaped.
        // builder.js will JSON.parse() this string to get the actual object.
        savedState: <?php echo json_encode( $saved_state ? $saved_state : null ); ?>
    };
    // Mode fullscreen standalone – pas besoin d'ouvrir un overlay
    var tmatorFullscreen = true;
    </script>
    <script src="<?php echo esc_url( $builder_js_url ); ?>?ver=<?php echo $version; ?>"></script>
    <?php wp_print_footer_scripts(); ?>
</body>
</html>
    <?php
    exit; // Empêche WordPress d'ajouter son propre HTML après
}
