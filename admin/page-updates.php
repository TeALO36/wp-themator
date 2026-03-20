<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// Fetch latest release from GitHub
$remote = wp_remote_get( 'https://api.github.com/repos/TeALO36/wp-themator/releases/latest', array(
    'timeout' => 10,
    'headers' => array( 'User-Agent' => 'WordPress/Themator' ),
) );

$latest_version  = null;
$latest_url      = null;
$published_at    = null;
$changelog       = null;

if ( ! is_wp_error( $remote ) && 200 === wp_remote_retrieve_response_code( $remote ) ) {
    $body = json_decode( wp_remote_retrieve_body( $remote ) );
    if ( $body && isset( $body->tag_name ) ) {
        $latest_version = ltrim( $body->tag_name, 'v' );
        $latest_url     = $body->html_url ?? null;
        $published_at   = $body->published_at ?? null;
        $changelog      = $body->body ?? null;
    }
}

$is_up_to_date = $latest_version && ! version_compare( THEMATOR_VERSION, $latest_version, '<' );
?>
<div class="themator-admin-wrap">
    <?php themator_admin_header( __( 'Mises à jour', 'themator' ) ); ?>

    <div class="tm-admin-section">
        <h2>📦 <?php esc_html_e( 'Informations sur la version', 'themator' ); ?></h2>

        <div class="tm-version-info">
            <div>
                <div style="font-size:12px; color:#999; margin-bottom:6px;"><?php esc_html_e( 'Version installée', 'themator' ); ?></div>
                <span class="tm-version-badge current">v<?php echo esc_html( THEMATOR_VERSION ); ?></span>
            </div>
            <?php if ( $latest_version ) : ?>
            <div>
                <div style="font-size:12px; color:#999; margin-bottom:6px;"><?php esc_html_e( 'Dernière version GitHub', 'themator' ); ?></div>
                <span class="tm-version-badge <?php echo $is_up_to_date ? 'latest' : 'outdated'; ?>">v<?php echo esc_html( $latest_version ); ?></span>
            </div>
            <?php if ( $published_at ) : ?>
            <div>
                <div style="font-size:12px; color:#999; margin-bottom:6px;"><?php esc_html_e( 'Publiée le', 'themator' ); ?></div>
                <span style="font-size:13px;"><?php echo esc_html( date_i18n( 'd/m/Y H:i', strtotime( $published_at ) ) ); ?></span>
            </div>
            <?php endif; ?>
            <?php endif; ?>
        </div>

        <?php if ( $latest_version ) : ?>
            <?php if ( $is_up_to_date ) : ?>
            <div class="tm-notice tm-notice-success">
                ✅ <?php esc_html_e( 'Themator est à jour.', 'themator' ); ?>
            </div>
            <?php else : ?>
            <div class="tm-notice tm-notice-warning">
                ⚠️ <?php printf( esc_html__( 'Une nouvelle version est disponible : v%s.', 'themator' ), esc_html( $latest_version ) ); ?>
                <?php esc_html_e( 'Allez dans Extensions → Mises à jour pour l\'installer.', 'themator' ); ?>
            </div>
            <?php if ( $latest_url ) : ?>
            <a href="<?php echo esc_url( $latest_url ); ?>" target="_blank" class="tm-btn tm-btn-primary">
                🔗 <?php esc_html_e( 'Voir la release sur GitHub', 'themator' ); ?>
            </a>
            <?php endif; ?>
            <?php endif; ?>
        <?php else : ?>
        <div class="tm-notice tm-notice-warning">
            ⚠️ <?php esc_html_e( 'Impossible de contacter l\'API GitHub. Vérifiez votre connexion.', 'themator' ); ?>
        </div>
        <?php endif; ?>

        <div class="tm-btn-row">
            <a href="<?php echo esc_url( admin_url( 'admin.php?page=themator-updates' ) ); ?>" class="tm-btn tm-btn-secondary">
                🔄 <?php esc_html_e( 'Vérifier à nouveau', 'themator' ); ?>
            </a>
            <a href="<?php echo esc_url( admin_url( 'update-core.php' ) ); ?>" class="tm-btn tm-btn-secondary">
                ⬆️ <?php esc_html_e( 'Page des mises à jour WordPress', 'themator' ); ?>
            </a>
        </div>
    </div>

    <?php if ( $changelog ) : ?>
    <div class="tm-admin-section">
        <h2>📋 <?php esc_html_e( 'Notes de version (changelog)', 'themator' ); ?></h2>
        <div style="font-size:13px; line-height:1.8; white-space:pre-wrap; color:#555; background:#fafbfc; padding:16px; border-radius:4px; border:1px solid #e0e0e0;">
            <?php echo wp_kses_post( $changelog ); ?>
        </div>
    </div>
    <?php endif; ?>
</div>
